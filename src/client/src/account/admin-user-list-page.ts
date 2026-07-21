import { inject } from '@aurelia/kernel';
import { IRouter } from '@aurelia/router';
import { CookieService } from '../cookie/cookie-service.js';
import { routes } from '../routes.js';
import { AccountService } from './account-service.js';
import { AspNetUser } from './asp-net-user.js';
import type { IRequestPasswordResetViewModel } from './request-password-reset-view-model.js';
import type { IUpdateUserRoleViewModel } from './update-user-role-view-model.js';

@inject(AccountService, IRouter, CookieService)
export class AdminUserListPage {
    users: AspNetUser[] = [];
    private roles: string[] = [];
    private pageSize = 10;
    private pageSizes = [5, 10, 15, 20, 50, 100];
    private filters = [
        { value: '', keys: ['email'] }
    ];
    private userLoadPromise: Promise<AspNetUser[]> | null = null;

    constructor(
        private readonly accountService: AccountService,
        private readonly router: IRouter,
        private readonly cookieService: CookieService) { }

    async binding() {
        this.filters[0].value = await this.cookieService.getCookie('Arelia2.DotNet.EmailFilter') ?? '';
        this.userLoadPromise = this.accountService.getUsers();
        this.roles = await this.accountService.getRoleHierarchy();
    }

    async attached() {
        this.users = await (this.userLoadPromise ?? this.accountService.getUsers());
        this.userLoadPromise = null;
    }

    emailFilterChanged(email: string) {
        this.filters[0].value = email;
        this.cookieService.setCookie('Arelia2.DotNet.EmailFilter', email, 0, 0, 20);
    }

    async deleteUser(userId: string) {
        await this.accountService.deleteUser(userId);
        if (this.users) {
            this.users = this.users.filter(user => user.id !== userId);
        }
    }

    async confirmEmail(userId: string) {
        try {
            const confirmed = await this.accountService.adminConfirmEmail(userId);

            if (confirmed) {
                const user = this.users.find(u => u.id === userId);
                if (user) {
                    user.emailConfirmed = true;
                }

                // Force the UI to refresh
                this.users = [...this.users];
            }

        } catch (error) {
            console.error('Error setting email confirmation:', error);
        }
    }

    async resetLockout(userId: string) {
        try {
            await this.accountService.resetLockout(userId);

            const user = this.users.find(u => u.id === userId);
            if (user) {
                user.isLockedOut = false;
            }

            // Force the UI to refresh
            this.users = [...this.users];

        } catch (error) {
            console.error('Error resetting lockout:', error);
        }
    }

    async requestPasswordReset(email: string) {
        const requestPasswordResetViewModel: IRequestPasswordResetViewModel = {
            email,
            passwordResetPage: '',
            turnstileToken: ''
        };

        const resetPasswordRoute = routes.find(route => route.id === 'reset-password');
        if (resetPasswordRoute) {
            requestPasswordResetViewModel.passwordResetPage = this.getBaseUrl() + '/' + resetPasswordRoute.path.split('/')[0];
        }

        try {
            await this.accountService.adminSendResetPasswordEmail(requestPasswordResetViewModel);
            console.log('Password reset link sent to specified email.');

        } catch (error) {
            console.error('Error sending password reset link:', error);
        }
    }

    hasRoleChanged(user: AspNetUser): boolean {
        return user.pendingRole !== user.role;
    }

    hasPendingRoleChanges(): boolean {
        return this.users.some(user => this.hasRoleChanged(user));
    }

    async saveRoles() {
        const changedUsers = this.users.filter(user => this.hasRoleChanged(user) && user.pendingRole);
        if (changedUsers.length === 0) {
            return;
        }

        try {
            for (const user of changedUsers) {
                const updateUserRoleViewModel: IUpdateUserRoleViewModel = { role: user.pendingRole! };
                const updatedRole = await this.accountService.updateUserRole(user.id, updateUserRoleViewModel);
                user.role = updatedRole;
                user.pendingRole = updatedRole;
            }

            await this.accountService.refreshAuthState();
            this.users = [...this.users];
        } catch (error) {
            console.error('Error updating user roles:', error);

            for (const user of this.users) {
                user.pendingRole = user.role;
            }
        }
    }

    private getBaseUrl(): string {
        const { protocol, host } = window.location;
        return `${protocol}//${host}`;
    }
}