import { inject } from '@aurelia/kernel';
import { observable } from '@aurelia/runtime';
import { hasRequiredRole } from './auth-roles.js';
import { CookieService } from '../cookie/cookie-service.js';
import { eventEmitter } from '../event-emitter.js';

@inject(CookieService)
export class AuthState {
    @observable public isAuthenticated: boolean = false;
    @observable public role: string | null = null;
    public roleHierarchy: string[] = [];
    @observable public emailConfirmationEnabled: boolean = false;
    private refreshAuthStatePromise: Promise<void> | null = null;

    constructor(private readonly cookieService: CookieService) {
        this.loadState();
        this.isAuthenticatedChanged();
        eventEmitter.on('resetLoginStatus', this.clearCurrentUser.bind(this));
    }

    public async refreshAuthState(): Promise<void> {
        if (this.refreshAuthStatePromise !== null) {
            return this.refreshAuthStatePromise;
        }

        this.refreshAuthStatePromise = this.loadCurrentUser();

        try {
            await this.refreshAuthStatePromise;
        } finally {
            this.refreshAuthStatePromise = null;
        }
    }

    private async loadCurrentUser(): Promise<void> {
        try {
            const response = await fetch('/api/account/CurrentUser', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                this.applyCurrentUser(result);
            }
        } catch {
            // Server unreachable; keep local state
        }
    }

    public applyCurrentUser(currentUser: { isAuthenticated: boolean; role?: string | null; roleHierarchy?: string[]; emailConfirmationEnabled?: boolean }): void {
        this.isAuthenticated = currentUser.isAuthenticated;
        this.role = currentUser.role ?? null;
        this.roleHierarchy = currentUser.roleHierarchy ?? this.roleHierarchy;
        this.emailConfirmationEnabled = currentUser.emailConfirmationEnabled ?? false;
        this.saveState();
        eventEmitter.emit('authStateChanged');
    }

    private isAuthenticatedChanged(): void {
        this.cookieService.setLogin(this.isAuthenticated);

        this.saveState();
    }

    private saveState(): void {
        localStorage.setItem('isAuthenticated', JSON.stringify(this.isAuthenticated));
        localStorage.setItem('role', JSON.stringify(this.role));
        localStorage.setItem('roleHierarchy', JSON.stringify(this.roleHierarchy));
        localStorage.setItem('emailConfirmationEnabled', JSON.stringify(this.emailConfirmationEnabled));
    }

    private loadState(): void {
        const isAuthenticated = localStorage.getItem('isAuthenticated');

        if (isAuthenticated !== null) {
            this.isAuthenticated = JSON.parse(isAuthenticated);
        }

        const role = localStorage.getItem('role');
        if (role !== null) {
            this.role = JSON.parse(role);
        }

        const roleHierarchy = localStorage.getItem('roleHierarchy');
        if (roleHierarchy !== null) {
            this.roleHierarchy = JSON.parse(roleHierarchy);
        }

        const emailConfirmationEnabled = localStorage.getItem('emailConfirmationEnabled');
        if (emailConfirmationEnabled !== null) {
            this.emailConfirmationEnabled = JSON.parse(emailConfirmationEnabled);
        }
    }

    public clearCurrentUser(): void {
        this.isAuthenticated = false;
        this.role = null;
        this.saveState();
        eventEmitter.emit('authStateChanged');
    }

    public hasRequiredRole(role: string | undefined): boolean {
        if (!role) {
            return true;
        }

        return hasRequiredRole(this.role, role, this.roleHierarchy);
    }
}