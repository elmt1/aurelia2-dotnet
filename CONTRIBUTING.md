# Contributing

Thank you for your interest in improving this starter template.

## Development Setup

1. Install the [prerequisites](README.md#prerequisites).
2. Clone the repo and open `aurelia2-dotnet.sln` in Visual Studio, or use the CLI:

   ```
   cd src\Aurelia2.DotNet.Web.Api
   dotnet run
   ```

3. The backend auto-starts the Vite client in Debug mode. See [Quick Start](README.md#quick-start) for details.

## Project Layout

| Path | Purpose |
|------|---------|
| `src/client/` | Aurelia 2 frontend (TypeScript, Vite, Bootstrap) |
| `src/Aurelia2.DotNet.Web.Api/` | ASP.NET Core 10 backend (Identity, EF Core, Serilog) |
| `publish-self-contained.ps1` | Self-contained publish script |

## Coding Conventions

### Backend (C#)

- Target .NET 10. Use nullable reference types (`<Nullable>enable</Nullable>`).
- Place controllers in `Controllers/`, view models in `Models/`, and EF Core classes in `Data/`.
- Use `[ApiController]` and `[Route("api/[controller]")]` on all controllers.
- Use `[Authorize]` or an authorization policy for protected endpoints; use `[AllowAnonymous]` for public ones.
- Antiforgery is applied globally — don't add `[ValidateAntiForgeryToken]` per-action.
- Log with the injected `ILogger<T>`; Serilog handles sinks and enrichment.

### Frontend (TypeScript)

- Place each feature in its own folder under `src/client/src/` (e.g., `product/`, `account/`).
- Each page has a `.ts` component class and a `.html` template.
- Register routes in `routes.ts` and optional menu entries in `nav-menu/menu-definitions.ts`.
- Use the shared `IHttpClient` (via `@inject(IHttpClient)`) with `credentials: 'include'` for API calls. The `HttpClientService` interceptor handles XSRF tokens and 401 redirects.
- Run `npm run lint` from `src/client` before committing.

## Making Changes

1. Create a feature branch from `main`.
2. Make your changes — keep commits focused.
3. Verify the backend builds: `dotnet build` from the repo root.
4. Verify the client lints: `npm run lint` from `src/client`.
5. Test manually: register, log in, access a protected page, log out.
6. Open a pull request with a clear description of what changed and why.

## Adding a New Feature End-to-End

A typical feature touches three places:

1. **Backend**: add a controller action (or new controller) under `Controllers/`.
2. **Client page**: add a folder under `src/client/src/` with a `.ts` + `.html` pair.
3. **Wiring**: add a route in `routes.ts` and optionally a menu entry in `menu-definitions.ts`.

See [Extending the Project](README.md#extending-the-project) in the README for step-by-step instructions.

## Reporting Issues

Open an issue with:

- Steps to reproduce.
- Expected vs. actual behavior.
- Browser / OS / .NET SDK version.
