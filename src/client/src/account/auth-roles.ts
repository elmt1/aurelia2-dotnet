function getRoleRank(roleHierarchy: readonly string[], role: string): number {
    return roleHierarchy.indexOf(role);
}

export function hasRequiredRole(userRole: string | null, requiredRole: string, roleHierarchy: readonly string[]): boolean {
    if (userRole === null) {
        return false;
    }

    const requiredRank = getRoleRank(roleHierarchy, requiredRole);
    if (requiredRank < 0) {
        return userRole === requiredRole;
    }

    const userRank = getRoleRank(roleHierarchy, userRole);
    return userRank >= 0 && userRank <= requiredRank;
}
