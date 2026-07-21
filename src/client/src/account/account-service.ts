import { IHttpClient, json } from '@aurelia/fetch-client';
import { inject } from 'aurelia';
import { HttpClientService } from '../http-client/http-client-service.js';
import { AuthState } from './auth-state.js';
import { AspNetUser } from './asp-net-user.js';
import type { ILoginViewModel } from './login-view-model.js';
import type { IRegisterViewModel } from './register-view-model.js';
import type { IRequestPasswordResetViewModel } from './request-password-reset-view-model.js';
import type { IResendConfirmationEmailViewModel } from './resend-confirmation-email-view-model.js';
import type { IResetPasswordViewModel } from './reset-password-view-model.js';
import type { IUpdateUserRoleViewModel } from './update-user-role-view-model.js';

async function getResponseMessages(response: Response, fallbackMessage: string): Promise<string[]> {
    try {
        const body = await response.json();
        if (Array.isArray(body)) {
            return body;
        }
    } catch { /* response body was not JSON */ }

    return [fallbackMessage];
}

@inject(IHttpClient, AuthState)
export class AccountService {

    constructor(
        private readonly httpClient: IHttpClient,
        private readonly authState: AuthState
    ) {
        HttpClientService.configure(this.httpClient);
    }

    // DEVELOPMENT ONLY method to create the user database
    async createUserDatabase(): Promise<boolean> {
        try {
            const response = await this.httpClient.fetch('/api/account/CreateUserDatabase', {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('Failed to create user database:', response.statusText);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error creating user database:', error);
            return false;
        }
    }

    async login(loginViewModel: ILoginViewModel): Promise<Response> {
        const response = await this.httpClient.fetch('/api/account/Login', {
            method: 'POST',
            body: json(loginViewModel),
            credentials: 'include'
        });

        if (!response.ok) {
            throw await getResponseMessages(response, 'Login failed.');
        }

        await HttpClientService.refreshXsrfToken();
        HttpClientService.resetUnauthorizedHandling();
        this.authState.applyCurrentUser(await response.json());
        return response;
    }

    async logout(): Promise<void> {
        const response = await this.httpClient.fetch('/api/account/Logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to logout');
        }

        await HttpClientService.refreshXsrfToken();
        HttpClientService.resetUnauthorizedHandling();
        HttpClientService.clearReturnUrl();
        this.authState.clearCurrentUser();
    }

    async register(registerViewModel: IRegisterViewModel): Promise<Response> {
        const response = await this.httpClient.fetch('/api/account/register', {
            method: 'POST',
            body: json(registerViewModel),
            credentials: 'include'
        });

        if (!response.ok) {
            let messages: string[] = ['Registration failed.'];
            try {
                const body = await response.json();
                if (Array.isArray(body)) {
                    messages = body;
                }
            } catch { /* response body was not JSON */ }
            throw messages;
        }

        await HttpClientService.refreshXsrfToken();
        HttpClientService.resetUnauthorizedHandling();
        this.authState.applyCurrentUser(await response.json());
        return response;
    }

    async confirmEmail(userId: string, code: string): Promise<boolean> {
        const response = await this.httpClient.fetch(`/api/account/confirmEmail?userId=${encodeURIComponent(userId)}&code=${encodeURIComponent(code)}`, {
            method: 'GET',
            credentials: 'include'
        });

        return response.ok;
    }

    async resendConfirmationEmail(resendConfirmationEmailViewModel: IResendConfirmationEmailViewModel): Promise<void> {
        const response = await this.httpClient.fetch('/api/account/ResendConfirmationEmail', {
            method: 'POST',
            body: json(resendConfirmationEmailViewModel),
            credentials: 'include'
        });

        if (!response.ok) {
            throw await getResponseMessages(response, 'Failed to resend confirmation email.');
        }
    }

    async sendResetPasswordEmail(requestResetPasswordViewModel: IRequestPasswordResetViewModel): Promise<void> {
        const response = await this.httpClient.fetch('/api/account/RequestPasswordReset', {
            method: 'POST',
            body: json(requestResetPasswordViewModel),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to send password reset email');
        }
    }

    async adminSendResetPasswordEmail(requestResetPasswordViewModel: IRequestPasswordResetViewModel): Promise<void> {
        const response = await this.httpClient.fetch('/api/account/AdminRequestPasswordReset', {
            method: 'POST',
            body: json(requestResetPasswordViewModel),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to send password reset email');
        }
    }

    async getUsers(): Promise<AspNetUser[]> {
        const response = await this.httpClient.fetch('/api/account/Users', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load users');
        }

        const users = await response.json() as AspNetUser[];
        return users.map(user => new AspNetUser(user));
    }

    public async getRoleHierarchy(): Promise<string[]> {
        await this.authState.refreshAuthState();
        return [...this.authState.roleHierarchy];
    }

    public async refreshAuthState(): Promise<void> {
        await this.authState.refreshAuthState();
    }

    async deleteUser(userId: string): Promise<void> {
        const response = await this.httpClient.fetch(`/api/account/Users/${encodeURIComponent(userId)}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to delete user');
        }
    }

    async adminConfirmEmail(userId: string): Promise<boolean> {
        const response = await this.httpClient.fetch(`/api/account/Users/${encodeURIComponent(userId)}/confirm-email`, {
            method: 'POST',
            credentials: 'include'
        });

        return response.ok;
    }

    async resetLockout(userId: string): Promise<void> {
        const response = await this.httpClient.fetch(`/api/account/Users/${encodeURIComponent(userId)}/reset-lockout`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to reset lockout');
        }
    }

    async updateUserRole(userId: string, updateUserRoleViewModel: IUpdateUserRoleViewModel): Promise<string> {
        const response = await this.httpClient.fetch(`/api/account/Users/${encodeURIComponent(userId)}/role`, {
            method: 'POST',
            body: json(updateUserRoleViewModel),
            credentials: 'include'
        });

        if (!response.ok) {
            throw await getResponseMessages(response, 'Failed to update user role.');
        }

        const body = await response.json() as { role?: string };
        return body.role ?? updateUserRoleViewModel.role;
    }

    async resetPassword(resetPasswordViewModel: IResetPasswordViewModel): Promise<void> {
        const response = await this.httpClient.fetch('/api/account/ResetPassword', {
            method: 'POST',
            body: json(resetPasswordViewModel),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to reset password');
        }
    }
}