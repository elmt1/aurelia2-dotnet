import { observable } from '@aurelia/runtime';

export class AuthState {
    @observable public isAuthenticated: boolean = false;
}