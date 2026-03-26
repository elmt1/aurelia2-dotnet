import { inject } from "@aurelia/kernel";
import { IRouter, route } from "@aurelia/router";
import { eventEmitter } from "./event-emitter";
import { HttpClientService } from "./http-client/http-client-service";
import { routes } from "./routes";

@inject(IRouter)
@route({
    routes: routes,
    fallback: 'not-found',
})
export class App {
    constructor(private readonly router: IRouter) {
        eventEmitter.on('unauthorized', this.handleUnauthorized.bind(this));
    }

    private handleUnauthorized(): void {
        if (!window.location.pathname.endsWith('/login')) {
            const returnUrl = HttpClientService.peekReturnUrl()
                ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;

            HttpClientService.storeReturnUrl(returnUrl);
            void this.router.load(`login?returnUrl=${encodeURIComponent(returnUrl)}`);
        }
    }
}