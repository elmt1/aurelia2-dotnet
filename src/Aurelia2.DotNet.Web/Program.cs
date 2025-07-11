using Aurelia2.DotNet.Web.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Serilog;

namespace Aurelia2.DotNet.Web;

public class Program
{
    public static void Main(string[] args)
    {
//        System.Diagnostics.Debugger.Launch();
        // Configure Serilog
        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(new ConfigurationBuilder()
                .AddJsonFile("appsettings.json")
                .Build())
            .CreateLogger();

        try
        {
            Log.Information("Starting up");

            var builder = WebApplication.CreateBuilder(args);

            Log.Information("Running " + (builder.Environment.IsProduction() ? "Production " : "Development ") + "build");

            // Add Serilog
            builder.Host.UseSerilog();
            // Add services to the container.
            var connectionString = builder.Configuration.GetConnectionString("IdentityConnection") ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
            builder.Services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(connectionString));



            // If there is some way to send email, require email confirmation
            var emailConfirmation = (builder.Configuration.GetValue<string>("SendGrid:Key") != null);
            if (emailConfirmation)
            {
                builder.Services.AddDefaultIdentity<IdentityUser>(options => options.SignIn.RequireConfirmedAccount = true)
                .AddEntityFrameworkStores<ApplicationDbContext>();

                //builder.Services.AddTransient<IEmailSender, EmailSender>();
            }
            else
            {
                builder.Services.AddDefaultIdentity<IdentityUser>()
                .AddEntityFrameworkStores<ApplicationDbContext>();
            }

            // Add authentication and authorization services
            builder.Services.ConfigureApplicationCookie(options =>
            {
                options.Cookie.Name = ".AspNetCore.Identity.Application";
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.None;
                options.LoginPath = "/login";
                options.LogoutPath = "/logout";

                // Customize behavior for API requests
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

            builder.Services.AddAuthorization(options =>
            {
                options.AddPolicy("VerifiedCustomer", policy =>
                    policy.RequireClaim("VerifiedCustomer"));
            });

            builder.Services.AddControllers();

            // Dev only
            if (!builder.Environment.IsProduction())
            { 
                builder.Services.AddCors(options =>
                {
                    options.AddDefaultPolicy(builder =>
                    {
                        builder.WithOrigins("https://localhost:5002")
                               .AllowAnyHeader()
                               .AllowAnyMethod()
                               .AllowCredentials();
                    });
                });
            }

            // Register IHttpContextAccessor and ClaimsPrincipal
            builder.Services.AddHttpContextAccessor();
            builder.Services.AddScoped<ClaimsPrincipal>(s =>
            {
                var httpContextAccessor = s.GetService<IHttpContextAccessor>();
                if (httpContextAccessor == null)
                {
                    throw new InvalidOperationException("IHttpContextAccessor is not registered or could not be resolved.");
                }
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

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.MapOpenApi();
            }

            app.UseHttpsRedirection();

            // Dev only
            if (app.Environment.IsDevelopment())
            {
                app.UseCors();
            }

            // Use the security headers middleware
            app.UseMiddleware<SecurityHeadersMiddleware>();

            // Prod only
            app.UseStaticFiles().UseStaticFiles().UseRouting();

            app.UseCookiePolicy();
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();

            if (app.Environment.IsProduction())
            {
                // Kestrel publish build only support serving the Aurelia app directly
                app.MapFallbackToFile("index.html");
            }

            app.Run();

        }
        catch (Exception ex)
        {
            Log.Fatal(ex, "Application start-up failed");
        }
        finally
        {
            Log.CloseAndFlush();
        }
    }
}