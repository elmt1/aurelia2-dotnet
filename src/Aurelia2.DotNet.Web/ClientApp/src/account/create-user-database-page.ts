import { inject } from "@aurelia/kernel";
import { AccountService } from "./account-service";
import { IResetPasswordViewModel } from "./reset-password-view-model";
import { IRouter, Params } from "@aurelia/router-lite";
import { routes } from '../routes'; // Import routes

@inject(AccountService, IRouter)
export class CreateUserDatabasePage {
    constructor(private readonly accountService: AccountService, private readonly router: IRouter) { }

    async createUserDatabase() {
        try {
            const response = await this.accountService.createUserDatabase();
            console.log('Database creation successful:', response);

            // Navigate to the home page upon successful registration
            this.router.load('home');

        } catch (error) {
            console.error('Database creation:', error);
        }
    }
}