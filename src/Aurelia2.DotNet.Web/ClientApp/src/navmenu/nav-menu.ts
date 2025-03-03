import { inject } from '@aurelia/kernel';
import { IRouter } from '@aurelia/router-lite';
import { AuthState } from './auth-state';
import { routes, Route } from '../routes';
import { menuDefinitions, MenuDefinition } from './menu-definitions';
import { AccountService } from '../account/account-service';

@inject(AccountService, IRouter, AuthState)
export class NavMenu {
    public menuDefinition: MenuDefinition[] = [];

    constructor(
        private readonly accountService: AccountService,
        private readonly router: IRouter,
        private readonly authState: AuthState
    ) { }

    public async binding() {
        this.menuDefinition = this.buildMenu(menuDefinitions);
    }

    private buildMenu(menuDefinitions: MenuDefinition[], parentPath: string = ''): MenuDefinition[] {
        return menuDefinitions.map(item => {
            const fullPath = `${parentPath}/${item.routeId}`.replace(/\/+/g, '/');
            const route = routes.find((r: Route) => r.id === item.routeId); // Ensure correct typing
            const menuItem: MenuDefinition = {
                routeId: item.routeId,
                route: route, // Store the route object
                title: item.title,
                icon: item.icon,
                children: item.children ? this.buildMenu(item.children, fullPath) : []
            };
            return menuItem;
        });
    }

    public async logout() {
        await this.accountService.logout();
        this.authState.isAuthenticated = false;
        this.router.load('home');
    }
}