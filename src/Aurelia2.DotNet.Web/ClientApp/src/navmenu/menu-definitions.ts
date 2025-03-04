// Define the nestable menu structure for the application
//   id: used to retrieve associated route
//   icon: used to set the class
//   title: used when an item doesn't have an associated route
export interface MenuDefinition {
    routeId: string;
    route?: any;
    title?: string;
    icon?: string;
    children?: MenuDefinition[];
}

export const menuDefinitions: MenuDefinition[] = [
    {
        routeId: 'home',
        icon: 'fas fa-house'
    },
    {
        routeId: 'product-list',
        icon: 'fas fa-list'
    },
    {
        routeId: 'config',
        title: 'Configuration',
        icon: 'fas fa-gears',
        children: [
            {
                routeId: 'register',
                icon: 'fas fa-address-card'
            },
            {
                routeId: 'request-password-reset',
                icon: 'fas fa-unlock'
            },
            {
                routeId: 'create-user-database',
                icon: 'fas fa-person-digging'
            },
            {
                routeId: 'about',
                icon: 'fas fa-circle-info'
            }
        ]
    }
];
