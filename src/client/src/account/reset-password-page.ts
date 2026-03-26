import { inject } from "@aurelia/kernel";
import { AccountService } from "./account-service";
import type { IResetPasswordViewModel } from "./reset-password-view-model";
import { IRouter } from "@aurelia/router";
import type { Params } from "@aurelia/router";

@inject(AccountService, IRouter)
export class ResetPasswordPage {
    private readonly resetPasswordViewModel: IResetPasswordViewModel;
    constructor(private readonly accountService: AccountService, private readonly router: IRouter) {
        this.resetPasswordViewModel = {
            userId: '',
            code: '',
            newPassword: '',
            confirmPassword: ''
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

    async resetPassword() {
        try {
            const response = await this.accountService.resetPassword(this.resetPasswordViewModel);
            console.log('Reset password successful:', response);

            // Navigate to the home page upon successful registration
            void this.router.load('home');

        } catch (error) {
            console.error('register failed:', error);
        }
    }
}