import { IRouter, Params } from "@aurelia/router-lite";
import { AccountService } from "./account-service";
import { inject } from "@aurelia/kernel";

@inject(AccountService, IRouter)
export class ConfirmEmailPage {
    private userId: string | null = null;
    private code: string | null = null;
    private confirmed: boolean = false;
    private error: boolean = false;

    constructor(private readonly accountService: AccountService, private readonly router: IRouter) { }

    public canLoad(params: Params): boolean {
        this.userId = params.userId;
        this.code = params.code;

        if (this.userId && this.code)
            return true;
        else
            return false;
    }

    public async attaching() {
        try {
            const response = await this.accountService.confirmEmail(this.userId, this.code);
            if (response === true) {
                this.confirmed = true;
                console.log('Email confirmation successful.');
            } else {
                this.error = true;
                console.log('Email confirmation unsuccessful.');
            }
        } catch (error) {
            this.error = true;
            console.error('Email confirmation failed:', error);
        }
    }

    public logIn() {
        this.router.load('login');
    }
}