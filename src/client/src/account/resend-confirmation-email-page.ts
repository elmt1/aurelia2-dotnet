import { inject } from "@aurelia/kernel";
import { routes } from '../routes.js';
import { AccountService } from "./account-service.js";
import type { IResendConfirmationEmailViewModel } from "./resend-confirmation-email-view-model.js";

@inject(AccountService)
export class ResendConfirmationEmailPage {
    private readonly resendConfirmationEmailModel: IResendConfirmationEmailViewModel = {
        email: '', confirmEmailPage: '', turnstileToken: ''
    };
    private emailInput!: HTMLInputElement;
    private errors: string[] = [];
    private sent: boolean = false;

    constructor(private readonly accountService: AccountService) { }

    private getBaseUrl(): string {
        const { protocol, host } = window.location;
        return `${protocol}//${host}`;
    }

    public attached(): void {
        if (this.emailInput) {
            this.emailInput.focus();
        }
    }

    private onTurnstileSuccess(event: CustomEvent): void {
        this.resendConfirmationEmailModel.turnstileToken = event.detail.token;
    }

    public async resendConfirmationEmail() {
        this.errors = [];
        this.sent = false;

        if (!this.resendConfirmationEmailModel.turnstileToken) {
            this.errors = ['Please complete the CAPTCHA.'];
            return;
        }

        try {
            const confirmEmailRoute = routes.find(route => route.id === 'confirm-email');
            if (confirmEmailRoute) {
                this.resendConfirmationEmailModel.confirmEmailPage = this.getBaseUrl() + '/' + confirmEmailRoute.path.split('/')[0];
            }

            await this.accountService.resendConfirmationEmail(this.resendConfirmationEmailModel);
            this.sent = true;
        } catch (error) {
            if (Array.isArray(error)) {
                this.errors = error;
            } else {
                this.errors = ['Failed to resend confirmation email.'];
            }
        }
    }
}
