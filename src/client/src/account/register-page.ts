import { inject } from "@aurelia/kernel";
import { IRouter } from "@aurelia/router";
import { routes } from '../routes.js';
import { AccountService } from "./account-service.js";
import type { IRegisterViewModel } from "./register-view-model.js";

@inject(AccountService, IRouter)
export class RegisterPage {
    private registerViewModel: IRegisterViewModel = {
        email: '', password: '', confirmPassword: '', confirmEmailPage: '', turnstileToken: ''
    };
    private emailInput: HTMLInputElement;
    constructor(private readonly accountService: AccountService, private readonly router: IRouter) { }
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
        this.registerViewModel.turnstileToken = event.detail.token;
    }

    private errors: string[] = [];

    async register() {
        this.errors = [];

        if (!this.registerViewModel.turnstileToken) {
            this.errors = ['Please complete the CAPTCHA.'];
            return;
        }

        try {
            const confirmEmailRoute = routes.find(route => route.id === 'confirm-email');
            if (confirmEmailRoute) {
                this.registerViewModel.confirmEmailPage = this.getBaseUrl() + '/' + confirmEmailRoute.path.split('/')[0];
            }

            const response = await this.accountService.register(this.registerViewModel);
            console.log('register successful:', response);

            void this.router.load('/home');

        } catch (error) {
            if (Array.isArray(error)) {
                this.errors = error;
            } else {
                this.errors = ['Registration failed.'];
            }
        }
    }
}