import { inject } from "@aurelia/kernel";
import { AccountService } from "./account-service";
import { IRegisterViewModel } from "./register-view-model";
import { IRouter } from "@aurelia/router-lite";
import { routes } from '../routes'; // Import routes

@inject(AccountService, IRouter)
export class RegisterPage {
    private readonly registerViewModel: IRegisterViewModel;
    constructor(private readonly accountService: AccountService, private readonly router: IRouter) { }
    private getBaseUrl(): string {

        const { protocol, host } = window.location;
        return `${protocol}//${host}`;
    }

    async register() {
        try {
            // Retrieve the email confirmation route
            const confirmEmailRoute = routes.find(route => route.id === 'confirm-email');
            if (confirmEmailRoute) {
                this.registerViewModel.confirmEmailPage = this.getBaseUrl() + '/' + confirmEmailRoute.path.split('/')[0];
            }

            const response = await this.accountService.register(this.registerViewModel);
            console.log('register successful:', response);

            // Navigate to the home page upon successful registration
            this.router.load('home');

        } catch (error) {
            console.error('register failed:', error);
        }
    }
}