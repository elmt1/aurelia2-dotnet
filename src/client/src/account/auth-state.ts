import { inject } from '@aurelia/kernel';
import { observable } from '@aurelia/runtime';
import { CookieService } from '../cookie/cookie-service.js';
import { eventEmitter } from '../event-emitter.js';

@inject(CookieService)
export class AuthState {
    @observable public isAuthenticated: boolean = false;

    constructor(private readonly cookieService: CookieService) {
        this.loadState();
        this.isAuthenticatedChanged();
        eventEmitter.on('resetLoginStatus', this.resetLoginStatus.bind(this));
    }

    private isAuthenticatedChanged(): void {
        this.cookieService.setLogin(this.isAuthenticated);

        this.saveState();
    }

    private saveState(): void {
        localStorage.setItem('isAuthenticated', JSON.stringify(this.isAuthenticated));
    }

    private loadState(): void {
        const isAuthenticated = localStorage.getItem('isAuthenticated');

        if (isAuthenticated !== null) {
            this.isAuthenticated = JSON.parse(isAuthenticated);
        }
    }

    private resetLoginStatus(): void {
        this.isAuthenticated = false;
    }
}