import { inject } from "@aurelia/kernel";
import { AccountService } from "./account-service";
import { ILoginViewModel } from "./login-view-model";
import { IRouter } from "@aurelia/router";
import { CookieService } from "../cookie/cookie-service";

@inject(AccountService, IRouter, CookieService)
export class LoginPage {
    private readonly loginViewModel: ILoginViewModel = { email: '', password: '', rememberMe: false };
    private emailInput: HTMLInputElement;
    private passwordInput: HTMLInputElement;

    constructor(
        private readonly accountService: AccountService,
        private readonly router: IRouter,
        private readonly cookieService: CookieService
    ) { }

    public attached(): void {
        // Retrieve email from cookie if it exists
        const rememberedEmail = this.cookieService.getCookie('Aurelia2.Email');
        if (rememberedEmail) {
            this.loginViewModel.email = rememberedEmail;
            this.loginViewModel.rememberMe = true;

            // Set focus to the password input element
            if (this.passwordInput) {
                this.passwordInput.focus();
            }
        } else {
            // Set focus to the email input element
            if (this.emailInput) {
                this.emailInput.focus();
            }
        }
    }

    async login() {
        try {
            const response = await this.accountService.login(this.loginViewModel);
            console.log('Login successful:', response);

            // Handle "Remember Me" functionality
            if (this.loginViewModel.rememberMe) {
                this.cookieService.setCookie('Aurelia2.Email', this.loginViewModel.email, 30); // Store for 30 days
            } else {
                this.cookieService.deleteCookie('Aurelia2.Email');
            }

            this.router.load('home');
        } catch (error) {
            console.error('Login failed:', error);
        }
    }
}