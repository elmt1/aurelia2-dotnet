namespace Aurelia2.DotNet.Web.Api.Authorization;

public static class Policy
{
    public const string PrincipalAccess = nameof(PrincipalAccess);
    public const string AdminAccess = nameof(AdminAccess);
    public const string VerifiedUserAccess = nameof(VerifiedUserAccess);
    public const string RegisteredUserAccess = nameof(RegisteredUserAccess);
}
