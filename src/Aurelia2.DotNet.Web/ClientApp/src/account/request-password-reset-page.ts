import { inject } from "@aurelia/kernel";
import { AccountService } from "./account-service";
import { IRequestPasswordResetViewModel } from "./request-password-reset-view-model";
import { IRouter } from "@aurelia/router-lite";
import { routes } from '../routes'; // Import routes

@inject(AccountService, IRouter)
export class RequestPasswordResetPage {
    private readonly requestPasswordResetModel: IRequestPasswordResetViewModel;
    constructor(private readonly accountService: AccountService, private readonly router: IRouter) { }
    private getBaseUrl(): string {
        const { protocol, host } = window.location;
        return `${protocol}//${host}`;
    }

    public async requestReset() {
        try {
            // Retrieve the reset password route
            const resetPasswordRoute = routes.find(route => route.id === 'reset-password');
            if (resetPasswordRoute) {
                this.requestPasswordResetModel.passwordResetPage = this.getBaseUrl() + '/' + resetPasswordRoute.path.split('/')[0];
            }

            await this.accountService.sendResetPasswordEmail(this.requestPasswordResetModel);
            alert('Password reset link sent to your email.');

        } catch (error) {
            console.error('Error sending password reset link:', error);
            alert('Failed to send password reset link.');
        }
    }
}