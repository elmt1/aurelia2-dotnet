using System.Net.Http.Json;

namespace Aurelia2.DotNet.Web.Api;

public sealed class TurnstileVerificationService(HttpClient httpClient, IConfiguration configuration)
{
    private readonly HttpClient httpClient = httpClient;
    private readonly IConfiguration configuration = configuration;

    public async Task<bool> VerifyTokenAsync(string token, string? remoteIp = null, CancellationToken cancellationToken = default)
    {
        var secretKey = configuration["Turnstile:SecretKey"];

        if (string.IsNullOrWhiteSpace(secretKey))
            throw new InvalidOperationException("Turnstile:SecretKey is not configured.");

        if (string.IsNullOrWhiteSpace(token))
            return false;

        var form = new Dictionary<string, string>
        {
            ["secret"] = secretKey,
            ["response"] = token
        };

        if (!string.IsNullOrWhiteSpace(remoteIp))
            form["remoteip"] = remoteIp;

        using var content = new FormUrlEncodedContent(form);
        using var response = await httpClient
            .PostAsync("https://challenges.cloudflare.com/turnstile/v0/siteverify", content, cancellationToken)
            .ConfigureAwait(false);

        if (!response.IsSuccessStatusCode)
            return false;

        var payload = await response.Content
            .ReadFromJsonAsync<TurnstileVerifyResponse>(cancellationToken: cancellationToken)
            .ConfigureAwait(false);

        return payload?.Success == true;
    }

    private sealed class TurnstileVerifyResponse
    {
        public bool Success { get; set; }
    }
}
