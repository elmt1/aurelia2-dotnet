import { IHttpClient, json } from '@aurelia/fetch-client';
import { inject } from 'aurelia';
import { AuthState } from './auth-state';
import { HttpClientService } from '../http-client/http-client-service';
import type { ILoginViewModel } from './login-view-model';
import type { IRegisterViewModel } from './register-view-model';
import type { IRequestPasswordResetViewModel } from './request-password-reset-view-model';
import type { IResetPasswordViewModel } from './reset-password-view-model';

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
            const response = await this.httpClient.fetch('api/account/CreateUserDatabase', {
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

    //async isAuthenticated(): Promise<boolean> {
    //    try {
    //        const response = await this.httpClient.fetch('api/account/IsAuthenticated', {
    //            method: 'GET',
    //            credentials: 'include'
    //        });

    //        if (!response.ok) {
    //            console.error('Failed to check authentication status:', response.statusText);
    //            return false;
    //        }

    //        const result = await response.json();
    //        this.authState.isAuthenticated = result.isAuthenticated;

    //        return result.isAuthenticated;

    //    } catch (error) {
    //        console.error('Error checking authentication status:', error);
    //        return false;
    //    }
    //}

    async login(loginViewModel: ILoginViewModel): Promise<Response> {
        try {
            const response = await this.httpClient.fetch('api/account/Login', {
                method: 'POST',
                body: json(loginViewModel),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            await HttpClientService.refreshXsrfToken();
            HttpClientService.resetUnauthorizedHandling();
            this.authState.isAuthenticated = true;
            return response;

        } catch (error) {
            console.error('Error during login:', error);
            throw error;
        }
    }

    async logout(): Promise<void> {
        const response = await this.httpClient.fetch('api/account/Logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to logout');
        }

        await HttpClientService.refreshXsrfToken();
        HttpClientService.resetUnauthorizedHandling();
        this.authState.isAuthenticated = false;
    }

    async register(registerViewModel: IRegisterViewModel): Promise<Response> {
        try {
            const response = await this.httpClient.fetch('api/account/register', {
                method: 'POST',
                body: json(registerViewModel),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Register failed');
            }

            await HttpClientService.refreshXsrfToken();
            return response;

        } catch (error) {
            console.error('Error during register:', error);
            throw error;
        }
    }

    async confirmEmail(userId: string, code: string): Promise<boolean> {
        const response = await this.httpClient.fetch(`api/account/confirmEmail?userId=${encodeURIComponent(userId)}&code=${encodeURIComponent(code)}`, {
            method: 'GET',
            credentials: 'include'
        });

        return response.ok;
    }

    async sendResetPasswordEmail(requestResetPasswordViewModel: IRequestPasswordResetViewModel): Promise<void> {
        const response = await this.httpClient.fetch('api/account/RequestPasswordReset', {
            method: 'POST',
            body: json(requestResetPasswordViewModel),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to send password reset email');
        }
    }

    async resetPassword(resetPasswordViewModel: IResetPasswordViewModel): Promise<void> {
        const response = await this.httpClient.fetch('api/account/ResetPassword', {
            method: 'POST',
            body: json(resetPasswordViewModel),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to reset password');
        }
    }
}