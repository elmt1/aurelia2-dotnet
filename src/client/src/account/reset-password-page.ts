import { inject } from "@aurelia/kernel";
import type { Params } from "@aurelia/router";
import { IRouter } from "@aurelia/router";
import { AccountService } from "./account-service.js";
import type { IResetPasswordViewModel } from "./reset-password-view-model.js";

@inject(AccountService, IRouter)
export class ResetPasswordPage {
    private readonly resetPasswordViewModel: IResetPasswordViewModel;
    private errors: string[] = [];

    constructor(private readonly accountService: AccountService, private readonly router: IRouter) {
        this.resetPasswordViewModel = {
            userId: '',
            code: '',
            newPassword: '',
            confirmPassword: '',
            turnstileToken: ''
        };
    }

    public canLoad(params: Params): boolean {
        this.resetPasswordViewModel.userId = params.userId;
        this.resetPasswordViewModel.code = params.code;

        if (this.resetPasswordViewModel.userId && this.resetPasswordViewModel.code)
            return true;
        else
            return false;
    }

    private onTurnstileSuccess(event: CustomEvent): void {
        this.resetPasswordViewModel.turnstileToken = event.detail.token;
    }

    async resetPassword() {
        this.errors = [];

        if (!this.resetPasswordViewModel.turnstileToken) {
            this.errors = ['Please complete the CAPTCHA.'];
            return;
        }

        try {
            const response = await this.accountService.resetPassword(this.resetPasswordViewModel);
            console.log('Reset password successful:', response);

            void this.router.load('/home');

        } catch (error) {
            if (Array.isArray(error)) {
                this.errors = error;
            } else {
                this.errors = ['Password reset failed.'];
            }
        }
    }
}