export class CookieService {
    private readonly loginCookieName = 'Aurelia2.Login';

    public setCookie(name: string, value: string, days: number, hours: number = 0, minutes: number = 0): void {
        const date = new Date();
        const totalMilliseconds = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
        date.setTime(date.getTime() + totalMilliseconds);
        const expires = "expires=" + date.toUTCString();
        document.cookie = `${name}=${value}; ${expires}; path=/; Secure; SameSite=Lax`;
    }

    public getCookie(name: string): string | null {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    public deleteCookie(name: string): void {
        document.cookie = `${name}=; Max-Age=-99999999;`;
    }

    public setLogin(state: boolean): void {
        if (state === true) {
            this.setCookie(this.loginCookieName, '1', 0, 1, 0);
        } else {
            this.deleteCookie(this.loginCookieName);
        }
    }

    public isLoggedIn(): boolean {
        return this.getCookie(this.loginCookieName) !== null;
    }
}