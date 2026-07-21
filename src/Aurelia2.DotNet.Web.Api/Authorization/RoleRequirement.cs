using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Aurelia2.DotNet.Web.Api.Authorization;

public sealed class RoleRequirement(Role minimumRole) : IAuthorizationRequirement
{
    public Role MinimumRole { get; } = minimumRole;
}

public sealed class RoleAuthorizationHandler : AuthorizationHandler<RoleRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, RoleRequirement requirement)
    {
        var roleName = RoleExtensions.GetHighestRoleName(
            context.User.FindAll(ClaimTypes.Role).Select(claim => claim.Value));

        if (roleName is not null
            && RoleExtensions.TryParseName(roleName, out var role)
            && role <= requirement.MinimumRole)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

public static class AuthorizationPolicyBuilderExtensions
{
    public static AuthorizationPolicyBuilder RequireMinimumRole(this AuthorizationPolicyBuilder builder, Role role)
    {
        builder.Requirements.Add(new RoleRequirement(role));
        return builder;
    }
}
