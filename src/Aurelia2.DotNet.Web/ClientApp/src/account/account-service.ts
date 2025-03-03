import { IHttpClient, json } from '@aurelia/fetch-client';
import { ILoginViewModel } from './login-view-model';
import { IRegisterViewModel } from './register-view-model';
import { resolve, newInstanceOf } from 'aurelia';
import { IRequestPasswordResetViewModel } from './request-password-reset-view-model';
import { IResetPasswordViewModel } from './reset-password-view-model';

export class AccountService {

    constructor(private readonly http: IHttpClient = resolve(newInstanceOf(IHttpClient))) {
    }

    async isAuthenticated(): Promise<boolean> {
        const response = await this.http.fetch('api/account/IsAuthenticated', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            return false;
        }

        const result = await response.json();
        return result.isAuthenticated;
    }

    async login(loginViewModel: ILoginViewModel): Promise<Response> {
        try {
            const response = await this.http.fetch('api/account/Login', {
                method: 'POST',
                body: json(loginViewModel),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            return response;

        } catch (error) {
            console.error('Error during login:', error);
            throw error;
        }
    }

    async logout(): Promise<void> {
        const response = await this.http.fetch('api/account/Logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to logout');
        }
    }

    async register(registerViewModel: IRegisterViewModel): Promise<Response> {
        try {
            const response = await this.http.fetch('api/account/register', {
                method: 'POST',
                body: json(registerViewModel)
            });

            if (!response.ok) {
                throw new Error('Register failed');
            }

            return response;

        } catch (error) {
            console.error('Error during register:', error);
            throw error;
        }
    }

    async confirmEmail(userId: string, code: string): Promise<boolean> {
        const response = await this.http.fetch(`api/account/confirmEmail?userId=${encodeURIComponent(userId)}&code=${encodeURIComponent(code)}`, {
            method: 'GET'
        });

        return response.ok;
    }

    async sendResetPasswordEmail(requestResetPasswordViewModel: IRequestPasswordResetViewModel): Promise<void> {
        const response = await this.http.fetch('api/account/RequestPasswordReset', {
            method: 'POST',
            body: json(requestResetPasswordViewModel),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to send password reset email');
        }
    }

    async resetPassword(resetPasswordViewModel: IResetPasswordViewModel): Promise<void> {
        const response = await this.http.fetch('api/account/ResetPassword', {
            method: 'POST',
            body: json(resetPasswordViewModel),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to reset password');
        }
    }
}