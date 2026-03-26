import { inject } from "@aurelia/kernel";
import { IRouter } from "@aurelia/router";
import { AccountService } from "./account-service.js";

@inject(AccountService, IRouter)
export class CreateUserDatabasePage {
    constructor(private readonly accountService: AccountService, private readonly router: IRouter) { }

    async createUserDatabase() {
        try {
            const response = await this.accountService.createUserDatabase();
            console.log('Database creation successful:', response);

            // Navigate to the home page upon successful registration
            void this.router.load('home');

        } catch (error) {
            console.error('Database creation:', error);
        }
    }
}