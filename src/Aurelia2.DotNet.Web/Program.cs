using Aurelia2.DotNet.Web.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Aurelia2.DotNet.Web;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

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
        });

        builder.Services.AddAuthorization(options =>
        {
            options.AddPolicy("VerifiedCustomer", policy =>
                policy.RequireClaim("VerifiedCustomer"));
        });

        builder.Services.AddControllers();

        // Dev only
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

        // Register IHttpContextAccessor and ClaimsPrincipal
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddScoped<ClaimsPrincipal>(s => s.GetService<IHttpContextAccessor>().HttpContext.User);

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
            app.MapOpenApi();
        }

        app.UseHttpsRedirection();

        // Dev only
        app.UseCors();

        // Use the security headers middleware
        app.UseMiddleware<SecurityHeadersMiddleware>();

        // Prod only
        app.UseStaticFiles().UseStaticFiles().UseRouting();

        app.UseCookiePolicy();
        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();


#if PUBLISHBUILD
        // Kestrel publish build only support serving the Aurelia app directly
        app.MapFallbackToFile("index.html");
#endif

        app.Run();
    }
}