import { route } from "@aurelia/router";
import { routes } from "./routes";

@route({
    routes: routes,
    fallback: 'not-found',
})
export class App {
}