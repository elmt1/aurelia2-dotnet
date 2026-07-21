namespace Aurelia2.DotNet.Web.Api.Authorization;

public enum Role
{
    Principal = 0,
    Admin = 1,
    VerifiedUser = 2,
    RegisteredUser = 3
}

public static class RoleExtensions
{
    public static string Name(this Role role) => role.ToString();

    public static IEnumerable<Role> All() => Enum.GetValues<Role>();

    public static string[] Names() => All()
        .Select(role => role.Name())
        .ToArray();

    public static bool TryParseName(string roleName, out Role role) =>
        Enum.TryParse(roleName, ignoreCase: false, out role);

    public static string? GetHighestRoleName(IEnumerable<string> roleNames)
    {
        return roleNames
            .Select(roleName => TryParseName(roleName, out var role) ? role : (Role?)null)
            .Where(role => role.HasValue)
            .Order()
            .Select(role => role!.Value.Name())
            .FirstOrDefault();
    }
}
