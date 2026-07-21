import { ConfirmEmailPage } from "./account/confirm-email-page.js";
import { AdminUserListPage } from "./account/admin-user-list-page.js";
import { LoginPage } from "./account/login-page.js";
import { NotFound } from "./not-found.js";
import { RegisterPage } from "./account/register-page.js";
import { WelcomePage } from "./home/welcome-page.js";
import { CustomElement } from "aurelia";
import { ProductListPage } from "./product/product-list-page.js";
import { RequestPasswordResetPage } from "./account/request-password-reset-page.js";
import { ResendConfirmationEmailPage } from "./account/resend-confirmation-email-page.js";
import { ResetPasswordPage } from "./account/reset-password-page.js";
import { CreateUserDatabasePage } from "./account/create-user-database-page.js";

export interface Route {
    id: string;
    path: string;
    component: unknown;
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
        id: 'admin-user-list',
        path: 'admin-user-list',
        component: AdminUserListPage,
        title: 'Admin User List',
        data: { auth: 'Admin' }
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
        id: 'default',
        path: '',
        component: WelcomePage,
        title: 'Welcome'
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
        title: 'Product List',
        data: { auth: 'RegisteredUser' }
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
        id: 'resend-confirmation-email',
        path: 'resend-confirmation-email',
        component: ResendConfirmationEmailPage,
        title: 'Resend Confirmation Email'
    },
    {
        id: 'reset-password',
        path: 'reset-password/:userId/:code',
        component: ResetPasswordPage,
        title: 'Reset Password'
    }
];