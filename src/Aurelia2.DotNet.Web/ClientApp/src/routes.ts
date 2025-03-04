import { ConfirmEmailPage } from "./account/confirm-email-page";
import { LoginPage } from "./account/login-page";
import { NotFound } from "./not-found";
import { RegisterPage } from "./account/register-page";
import { WelcomePage } from "./home/welcome-page";
import { CustomElement } from "aurelia";
import { ProductListPage } from "./product/product-list-page";
import { RequestPasswordResetPage } from "./account/request-password-reset-page";
import { ResetPasswordPage } from "./account/reset-password-page";
import { CreateUserDatabasePage } from "./account/create-user-database-page";

export interface Route {
    id: string;
    path: string;
    component: any;
    title: string;
    nav?: boolean;
    data?: {
        auth?: string;
    };
}

export const routes: Route[] = [
    {
        id: 'about',
        path: 'about',
        component: CustomElement.define({ name: 'about-page', template: '<template><h1>About Page</h1></template>' }),
        title: 'About'
    },
    {
        id: 'confirm-email',
        path: 'confirm-email/:userId/:code',
        component: ConfirmEmailPage,
        title: 'Confirm Email'
    },
    {
        id: 'create-user-database',
        path: 'create-user-database',
        component: CreateUserDatabasePage,
        title: 'Create User Database'
    },
    {
        id: 'home',
        path: 'home',
        component: WelcomePage,
        title: 'Welcome'
    },
    {
        id: 'login',
        path: 'login',
        component: LoginPage,
        title: 'Login'
    },
    {
        id: 'product-list',
        path: 'product-list',
        component: ProductListPage,
        title: 'Product List'
    },
    {
        id: 'not-found',
        path: 'not-found',
        component: NotFound,
        title: 'Not Found'
    },
    {
        id: 'register',
        path: 'register',
        component: RegisterPage,
        title: 'Register'
    },
    {
        id: 'request-password-reset',
        path: 'request-password-reset',
        component: RequestPasswordResetPage,
        title: 'Request Password Reset'
    },
    {
        id: 'reset-password',
        path: 'reset-password/:userId/:code',
        component: ResetPasswordPage,
        title: 'Reset Password'
    }
];