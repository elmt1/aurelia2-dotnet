import type { Route } from '../routes.js';

// Define the nestable menu structure for the application
//   id: used to retrieve associated route
//   icon: used to set the class
//   title: used when an item doesn't have an associated route
export interface MenuDefinition {
    routeId: string;
    route?: Route;
    title?: string;
    icon?: string;
    isActive?: boolean;
    children?: MenuDefinition[];
}

export const menuDefinitions: MenuDefinition[] = [
    {
        routeId: 'home',
        icon: 'house'
    },
    {
        routeId: 'product-list',
        icon: 'list'
    },
    {
        routeId: 'config',
        title: 'Configuration',
        icon: 'gears',
        children: [
            {
                routeId: 'admin-user-list',
                icon: 'gear'
            },
            {
                routeId: 'register',
                icon: 'address-card'
            },
            {
                routeId: 'request-password-reset',
                icon: 'unlock'
            },
            {
                routeId: 'create-user-database',
                icon: 'person-digging'
            },
            {
                routeId: 'about',
                icon: 'circle-info'
            }
        ]
    }
];
