import { inject } from "@aurelia/kernel";
import { AccountService } from "./account-service";
import { ILoginViewModel } from "./login-view-model";
import { IRouter } from "@aurelia/router-lite";
import { AuthState } from '../navmenu/auth-state';

@inject(AccountService, IRouter, AuthState)
export class LoginPage {
    private readonly loginViewModel: ILoginViewModel;
    
    constructor(
        private readonly accountService: AccountService,
        private readonly router: IRouter,
        private readonly authState: AuthState) { }

    async login() {
        try {
            const response = await this.accountService.login(this.loginViewModel);
            console.log('Login successful:', response);

            // Update the authentication state
            this.authState.isAuthenticated = true;;

            this.router.load('home');
        } catch (error) {
            console.error('Login failed:', error);
        }
    }
}
