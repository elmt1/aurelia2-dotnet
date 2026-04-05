import { inject } from "@aurelia/kernel";
import { IRouter } from "@aurelia/router";
import { routes } from '../routes.js'; // Import routes
import { AccountService } from "./account-service.js";
import type { IRequestPasswordResetViewModel } from "./request-password-reset-view-model.js";

@inject(AccountService, IRouter)
export class RequestPasswordResetPage {
    private readonly requestPasswordResetModel: IRequestPasswordResetViewModel = {
        email: '', passwordResetPage: '', turnstileToken: ''
    };
    private emailInput: HTMLInputElement;
    private errors: string[] = [];

    constructor(private readonly accountService: AccountService, private readonly router: IRouter) { }
    private getBaseUrl(): string {
        const { protocol, host } = window.location;
        return `${protocol}//${host}`;
    }

    public attached(): void {
        // Set focus to the email input element
        if (this.emailInput) {
            this.emailInput.focus();
        }
    }

    private onTurnstileSuccess(event: CustomEvent): void {
        this.requestPasswordResetModel.turnstileToken = event.detail.token;
    }

    public async requestReset() {
        this.errors = [];

        if (!this.requestPasswordResetModel.turnstileToken) {
            this.errors = ['Please complete the CAPTCHA.'];
            return;
        }

        try {
            // Retrieve the reset password route
            const resetPasswordRoute = routes.find(route => route.id === 'reset-password');
            if (resetPasswordRoute) {
                this.requestPasswordResetModel.passwordResetPage = this.getBaseUrl() + '/' + resetPasswordRoute.path.split('/')[0];
            }

            await this.accountService.sendResetPasswordEmail(this.requestPasswordResetModel);
            alert('Password reset link sent to your email.');

        } catch (error) {
            if (Array.isArray(error)) {
                this.errors = error;
            } else {
                this.errors = ['Failed to send password reset link.'];
            }
        }
    }
}