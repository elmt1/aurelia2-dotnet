namespace Aurelia2.DotNet.Web;

public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        this.next = next;
    }

    public async Task Invoke(HttpContext context)
    {
        context.Response.Headers["Content-Security-Policy"] = "default-src 'self';";
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["X-Frame-Options"] = "DENY";
        context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
        context.Response.Headers["Permissions-Policy"] = "geolocation=(self), microphone=(), camera=(), usb=(), vr=(), midi=(), magnetometer=(), fullscreen=(), payment=()";
        context.Response.Headers["Expect-CT"] = "max-age=86400, enforce";
        context.Response.Headers["Feature-Policy"] = "vibrate 'none';";

        await this.next(context);
    }
}