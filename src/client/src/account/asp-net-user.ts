export class AspNetUser {
    id!: string;
    email!: string;
    role: string | null = null;
    pendingRole: string | null = null;
    domain!: string;
    emailConfirmed!: boolean;
    lockoutEnabled!: boolean;
    twoFactorEnabled!: boolean;
    isLockedOut!: boolean;
    isInCurrentDomain!: boolean;

    constructor(data: Partial<AspNetUser>) {
        Object.assign(this, data);
        this.pendingRole = this.role;
    }
}