using Aurelia2.DotNet.Web.Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Serilog;
using System.Diagnostics;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Http;
using System.Security.Claims;

namespace Aurelia2.DotNet.Web.Api;

public class Program
{
    public static void Main(string[] args)
    {
        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(new ConfigurationBuilder()
                .AddJsonFile("appsettings.json")
                .Build())
            .CreateLogger();

#if DEBUG
        Process? clientProcess = null;
#endif

        try
        {
            Log.Information("Starting up");

            var builder = WebApplication.CreateBuilder(args);

            Log.Information("Running " + (builder.Environment.IsProduction() ? "Production " : "Development ") + "build");

            builder.Host.UseSerilog();

            var connectionString = builder.Configuration.GetConnectionString("IdentityConnection")
                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

            builder.Services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(connectionString));

            var emailConfirmation = builder.Configuration.GetValue<string>("SendGrid:Key") != null;
            if (emailConfirmation)
            {
                builder.Services.AddDefaultIdentity<IdentityUser>(options => options.SignIn.RequireConfirmedAccount = true)
                    .AddEntityFrameworkStores<ApplicationDbContext>();
            }
            else
            {
                builder.Services.AddDefaultIdentity<IdentityUser>()
                    .AddEntityFrameworkStores<ApplicationDbContext>();
            }

            builder.Services.ConfigureApplicationCookie(options =>
            {
                options.Cookie.Name = ".AspNetCore.Identity.Application";
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.LoginPath = "/login";
                options.LogoutPath = "/logout";

                options.Events.OnRedirectToLogin = context =>
                {
                    if (context.Request.Path.StartsWithSegments("/api"))
                    {
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        return Task.CompletedTask;
                    }

                    context.Response.Redirect(context.RedirectUri);
                    return Task.CompletedTask;
                };
            });

            builder.Services.AddAuthorizationBuilder()
                .AddPolicy("VerifiedCustomer", policy =>
                    policy.RequireClaim("VerifiedCustomer"));

            builder.Services.AddAntiforgery(options =>
            {
                options.HeaderName = "X-XSRF-TOKEN";
                options.Cookie.Name = "XSRF-TOKEN";
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Lax;
            });

            builder.Services.AddControllers(options =>
            {
                options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute());
            });

            if (!builder.Environment.IsProduction())
            {
                var corsOrigin = builder.Configuration["CORS"] ?? "https://localhost:5002";

                builder.Services.AddCors(options =>
                {
                    options.AddDefaultPolicy(policy =>
                    {
                        policy.WithOrigins(corsOrigin)
                            .AllowAnyHeader()
                            .AllowAnyMethod()
                            .AllowCredentials();
                    });
                });
            }

            builder.Services.AddHttpContextAccessor();
            builder.Services.AddHttpClient<TurnstileVerificationService>();
            builder.Services.AddScoped<ClaimsPrincipal>(s =>
            {
                var httpContextAccessor = s.GetService<IHttpContextAccessor>()
                    ?? throw new InvalidOperationException("IHttpContextAccessor is not registered or could not be resolved.");

                if (httpContextAccessor.HttpContext == null)
                {
                    throw new InvalidOperationException("HttpContext is null. This may occur outside an HTTP request.");
                }

                if (httpContextAccessor.HttpContext.User == null)
                {
                    throw new InvalidOperationException("HttpContext.User is null.");
                }

                return httpContextAccessor.HttpContext.User;
            });

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.MapOpenApi();
            }

            app.UseHttpsRedirection();

            if (app.Environment.IsDevelopment())
            {
                app.UseCors();
            }

            app.UseMiddleware<SecurityHeadersMiddleware>();
            app.UseStaticFiles();
            app.UseRouting();
            app.UseCookiePolicy();
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();

            if (app.Environment.IsProduction())
            {
                app.MapFallbackToFile("index.html");
            }

#if DEBUG
            clientProcess = StartClientIfNeeded();
#endif

            app.Run();
        }
        catch (Exception ex)
        {
            Log.Fatal(ex, "Application start-up failed");
        }
        finally
        {
#if DEBUG
            StopClient(clientProcess);
#endif
            Log.CloseAndFlush();
        }
    }

#if DEBUG
    private static Process? StartClientIfNeeded()
    {
        const int port = 5002;
        const int startupTimeoutSeconds = 30;

        if (IsPortListening(port))
        {
            Console.WriteLine($"Client already running on https://localhost:{port}");
            return null;
        }

        var clientDir = TryFindClientDirectory();
        if (clientDir is null)
        {
            Console.WriteLine("Client directory not found. Expected to locate `src\\client` by walking up from the app base directory.");
            Console.WriteLine($"AppContext.BaseDirectory: {AppContext.BaseDirectory}");
            return null;
        }

        Console.WriteLine($"Starting Aurelia client (Vite) in: {clientDir}");

        if (!EnsureClientDependenciesInstalled(clientDir))
        {
            return null;
        }

        var startInfo = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/c npm run start",
            WorkingDirectory = clientDir,
            UseShellExecute = true,
            CreateNoWindow = false
        };

        var process = Process.Start(startInfo);

        if (process is null)
        {
            Console.WriteLine("Failed to start Aurelia client process.");
            return null;
        }

        Console.WriteLine($"Client start requested (PID: {process.Id}). Expected URL: https://localhost:{port}");

        if (!WaitForClientReady($"https://localhost:{port}/", TimeSpan.FromSeconds(startupTimeoutSeconds)))
        {
            Console.WriteLine($"Timed out waiting for the Aurelia client to start on https://localhost:{port}.");
        }

        return process;
    }

    private static bool EnsureClientDependenciesInstalled(string clientDir)
    {
        var packageJsonPath = Path.Combine(clientDir, "package.json");
        var packageLockPath = Path.Combine(clientDir, "package-lock.json");
        var installStampPath = Path.Combine(clientDir, "node_modules", ".install-stamp");
        var vitePath = Path.Combine(clientDir, "node_modules", ".bin", "vite.cmd");

        if (File.Exists(vitePath) && !NeedsNpmInstall(packageJsonPath, packageLockPath, installStampPath))
        {
            return true;
        }

        Console.WriteLine("Client dependencies not found. Running npm install...");

        var installInfo = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/c npm install",
            WorkingDirectory = clientDir,
            UseShellExecute = false,
            CreateNoWindow = false
        };

        using var installProcess = Process.Start(installInfo);
        if (installProcess is null)
        {
            Console.WriteLine("Failed to start npm install.");
            return false;
        }

        installProcess.WaitForExit();

        if (installProcess.ExitCode != 0)
        {
            Console.WriteLine($"npm install failed with exit code {installProcess.ExitCode}.");
            return false;
        }

        Directory.CreateDirectory(Path.GetDirectoryName(installStampPath)!);
        File.WriteAllText(installStampPath, DateTime.UtcNow.ToString("O"));

        return File.Exists(vitePath);
    }

    private static bool NeedsNpmInstall(string packageJsonPath, string packageLockPath, string installStampPath)
    {
        if (!File.Exists(installStampPath))
        {
            return true;
        }

        var installStampTime = File.GetLastWriteTimeUtc(installStampPath);
        var packageJsonTime = File.Exists(packageJsonPath)
            ? File.GetLastWriteTimeUtc(packageJsonPath)
            : DateTime.MinValue;
        var packageLockTime = File.Exists(packageLockPath)
            ? File.GetLastWriteTimeUtc(packageLockPath)
            : DateTime.MinValue;

        return packageJsonTime > installStampTime || packageLockTime > installStampTime;
    }

    private static string? TryFindClientDirectory()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);

        for (var i = 0; i < 15 && dir is not null; i++)
        {
            var candidate = Path.Combine(dir.FullName, "src", "client");
            if (Directory.Exists(candidate))
            {
                return candidate;
            }

            dir = dir.Parent;
        }

        return null;
    }

    private static bool IsPortListening(int port) =>
        IPGlobalProperties.GetIPGlobalProperties()
            .GetActiveTcpListeners()
            .Any(endpoint => endpoint.Port == port);

    private static bool WaitForClientReady(string clientUrl, TimeSpan timeout)
    {
        var stopwatch = Stopwatch.StartNew();
        using var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = static (_, _, _, _) => true
        };
        using var httpClient = new HttpClient(handler)
        {
            Timeout = TimeSpan.FromSeconds(2)
        };

        while (stopwatch.Elapsed < timeout)
        {
            try
            {
                using var response = httpClient.GetAsync(clientUrl).GetAwaiter().GetResult();
                if (response.StatusCode != HttpStatusCode.NotFound)
                {
                    return true;
                }
            }
            catch
            {
            }

            Thread.Sleep(250);
        }

        return false;
    }

    private static void StopClient(Process? process)
    {
        if (process is null || process.HasExited)
        {
            return;
        }

        Console.WriteLine("Stopping Aurelia client...");

        try
        {
            process.Kill(entireProcessTree: true);
            process.WaitForExit(5000);
            Console.WriteLine("Client stopped.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error stopping client: {ex.Message}");
        }
    }
#endif
}
