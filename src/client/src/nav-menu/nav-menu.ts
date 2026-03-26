import { inject } from '@aurelia/kernel';
import { IRouter } from '@aurelia/router';
import { AccountService } from '../account/account-service.js';
import type { Route } from '../routes.js';
import { routes } from '../routes.js';
import type { MenuDefinition } from './menu-definitions.js';
import { menuDefinitions } from './menu-definitions.js';

@inject(AccountService, IRouter)
export class NavMenu {
    public menuDefinition: MenuDefinition[] = [];

    constructor(
        private readonly accountService: AccountService,
        private readonly router: IRouter) { }

    public async binding() {
        this.menuDefinition = this.buildMenu(menuDefinitions);
    }

    private buildMenu(menuDefinitions: MenuDefinition[], parentPath: string = ''): MenuDefinition[] {
        return menuDefinitions.map(item => {
            const fullPath = `${parentPath}/${item.routeId}`.replace(/\/+/g, '/');
            const route = routes.find((r: Route) => r.id === item.routeId);
            const menuItem: MenuDefinition = {
                routeId: item.routeId,
                route: route,
                isActive: false,
                title: item.title,
                icon: item.icon,
                children: item.children ? this.buildMenu(item.children, fullPath) : []
            };
            return menuItem;
        });
    }

    public setActive(menuItem: MenuDefinition) {
        this.menuDefinition.forEach(item => {
            item.isActive = item === menuItem;
            if (item.children && item.children.length > 0) {
                item.children.forEach(child => {
                    child.isActive = false;
                });
            }
        });
    }

    public async logout() {
        await this.accountService.logout();
        void this.router.load('home');
    }
}