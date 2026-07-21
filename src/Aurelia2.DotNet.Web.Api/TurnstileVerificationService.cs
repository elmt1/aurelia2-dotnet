using System.Net.Http.Json;
using System.Net;
using System.Text.Json.Serialization;

namespace Aurelia2.DotNet.Web.Api;

public sealed class TurnstileVerificationService(HttpClient httpClient, IConfiguration configuration, ILogger<TurnstileVerificationService> logger)
{
    private readonly HttpClient httpClient = httpClient;
    private readonly IConfiguration configuration = configuration;
    private readonly ILogger<TurnstileVerificationService> logger = logger;

    public async Task<bool> VerifyTokenAsync(string token, string? remoteIp = null, CancellationToken cancellationToken = default)
    {
        var secretKey = configuration["Turnstile:SecretKey"];

        if (string.IsNullOrWhiteSpace(secretKey))
            throw new InvalidOperationException("Turnstile:SecretKey is not configured.");

        var secretHash = Convert.ToHexString(
            System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(secretKey)))[..12];

        if (string.IsNullOrWhiteSpace(token))
            return false;

        var form = new Dictionary<string, string>
        {
            ["secret"] = secretKey,
            ["response"] = token
        };

        if (!string.IsNullOrWhiteSpace(remoteIp) && !IsLoopbackAddress(remoteIp))
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

        if (payload?.Success == true)
            return true;

        logger.LogWarning(
            "Turnstile verification failed. ErrorCodes: {ErrorCodes}",
            payload?.ErrorCodes is { Length: > 0 } ? string.Join(", ", payload.ErrorCodes) : "none");

        return false;
    }

    private static bool IsLoopbackAddress(string remoteIp)
    {
        return IPAddress.TryParse(remoteIp, out var address) && IPAddress.IsLoopback(address);
    }

    private sealed class TurnstileVerifyResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("error-codes")]
        public string[] ErrorCodes { get; set; } = [];
    }
}
