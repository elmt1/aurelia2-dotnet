import { route } from "@aurelia/router-lite";
import { routes } from "./routes";

@route({
    routes: routes,
    fallback: 'not-found',
})
export class App {
}