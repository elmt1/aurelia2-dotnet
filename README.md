# aurelia2-dotnet

A starter template for building web applications with an **Aurelia 2** (TypeScript / Vite) frontend and an **ASP.NET Core 10** backend. It includes cookie-based authentication with ASP.NET Core Identity, role-based authorization, XSRF protection, security headers, an admin user-list page, and a Bootstrap navigation menu — ready to extend with your own pages and API endpoints.

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) (LTS recommended)
- SQL Server (LocalDB works for development)

## Quick Start

1. Clone the repository.
2. Open `aurelia2-dotnet.sln` in Visual Studio and run the **Aurelia2.DotNet.Web.Api** profile, or start the backend from the command line:

   ```
   cd src\Aurelia2.DotNet.Web.Api
   dotnet run
   ```

3. In Debug mode the backend automatically runs `npm install` (if needed) and starts the Vite dev server on `https://localhost:5002`. The browser opens to that URL.
4. Use the **Create User Database** page (Configuration menu) to run EF Core migrations and create the Identity database.
5. Register the account configured by `BootstrapRole` to receive the initial `Principal` role, or register another account to receive `RegisteredUser`.
6. Log in, browse the Product List, and use **Configuration > Admin User List** with an `Admin` or `Principal` account to verify the full stack.

Development URLs:

| Service | URL |
|---------|-----|
| Backend API | `https://localhost:5001` |
| Client (Vite) | `https://localhost:5002` |

## Project Structure

```
src/
├── client/                          # Aurelia 2 + Vite frontend
│   ├── src/
│   │   ├── account/                 # Login, register, password reset, and admin user-list pages
│   │   ├── cookie/                  # Cookie helper service
│   │   ├── home/                    # Welcome / About pages
│   │   ├── http-client/             # Shared HTTP client + XSRF handling
│   │   ├── nav-menu/                # Bootstrap nav-menu element + menu definitions
│   │   ├── product/                 # Product list page (authorized)
│   │   ├── routes.ts                # Route definitions
│   │   ├── main.ts                  # Aurelia bootstrap
│   │   └── app.ts                   # Root component + 401 redirect handler
│   ├── vite.config.ts               # Dev server, HTTPS cert, /api proxy
│   ├── eslint.config.mjs            # ESLint + typescript-eslint
│   └── package.json
└── Aurelia2.DotNet.Web.Api/         # ASP.NET Core backend
    ├── Controllers/
    │   ├── AccountController.cs     # Auth and admin user-management endpoints
    │   └── ProductController.cs     # Sample authorized endpoint
    ├── Data/                        # EF Core DbContext + migrations
    ├── Models/                      # View models
    ├── SecurityHeadersMiddleware.cs  # CSP, HSTS, and other headers
    ├── Program.cs                   # App configuration + auto-start client
    └── appsettings.json             # Connection string, Serilog config
```

## Architecture Overview

```
Browser ── https://localhost:5002 ──▶ Vite dev server ── /api/* proxy ──▶ ASP.NET Core (5001)
                                                                              │
                                                                        SQL Server
                                                                       (Identity DB)
```

- **Development**: The Vite dev server serves the Aurelia SPA and proxies `/api/*` requests to the backend. CORS is enabled so cookies flow between the two origins.
- **Production**: The backend serves the built client from `wwwroot` and handles API routes directly. The Vite proxy and CORS are not used.

### Authentication Flow

1. Client calls `GET /api/account/antiforgery-token` and caches the XSRF token.
2. Every unsafe request (`POST`, `PUT`, `DELETE`, `PATCH`) includes the token in an `X-XSRF-TOKEN` header via the shared `HttpClientService` interceptor.
3. Login/register use cookie-based ASP.NET Core Identity. Application roles are assigned through ASP.NET Core Identity roles, custom claims (`Host`, `VerifiedCustomer`) are added, and the sign-in is refreshed so policy-protected endpoints work immediately.
4. On a `401` response, the client resets auth state and redirects to the login page.

### Roles and Administration

- The application seeds four roles on startup: `Principal`, `Admin`, `VerifiedUser`, and `RegisteredUser`.
- Role checks are hierarchical. `Principal` has the highest access, followed by `Admin`, `VerifiedUser`, and `RegisteredUser`.
- The email address configured by `BootstrapRole` receives the `Principal` role the first time that user is registered or signs in. Other users receive `RegisteredUser` by default.
- `GET /api/account/CurrentUser` returns the current user's highest application role so the client can protect routes and menu items.
- **Configuration > Admin User List** is available to users with at least the `Admin` role. It lists Identity users and supports deleting users, confirming email addresses, resetting lockouts, sending password reset emails, and saving role changes.

## Extending the Project

### Add a Client Page

1. Create `src/client/src/my-feature/my-page.ts` (component class) and `my-page.html` (template).
2. Add a route entry in `src/client/src/routes.ts`.
3. Optionally add a menu entry in `src/client/src/nav-menu/menu-definitions.ts` (supports nested items).

### Add an API Endpoint

1. Create a new controller in `src/Aurelia2.DotNet.Web.Api/Controllers/` using the `[Route("api/[controller]")]` and `[ApiController]` attributes.
2. Use `[Authorize]` or `[Authorize(Policy = "...")]` on actions that require authentication. Use `[AllowAnonymous]` on public actions.
3. Antiforgery validation is applied globally via `AutoValidateAntiforgeryTokenAttribute`, so `POST`/`PUT`/`DELETE` actions are protected automatically.

### Add an Authorization Policy

1. Add the role to `Authorization/Role.cs` if the policy needs a new application role.
2. Register the policy in `Program.cs` using `AddAuthorizationBuilder().AddPolicy(...)` and `RequireMinimumRole(...)`.
3. Apply `[Authorize(Policy = "YourPolicy")]` to the controller or action.
4. Add matching route `data.auth` and menu expectations on the client when the policy protects a page.

Existing policies are `PrincipalAccess`, `AdminAccess`, `VerifiedUserAccess`, and `RegisteredUserAccess`.

### Add an Admin User Action

1. Add the protected action to `AccountController` with `[Authorize(Policy = Policy.AdminAccess)]`.
2. Add a method to `src/client/src/account/account-service.ts` that calls the endpoint through the shared HTTP client.
3. Wire the action into `src/client/src/account/admin-user-list-page.ts` and `admin-user-list-page.html`.

### Add an EF Core Entity / Migration

1. Add your entity class and update `ApplicationDbContext` in `src/Aurelia2.DotNet.Web.Api/Data/`.
2. Generate a migration:

   ```
   dotnet ef migrations add <Name> --project src\Aurelia2.DotNet.Web.Api
   ```

   (requires the `Microsoft.EntityFrameworkCore.Design` package)

### Calling the API from Client Code

Use the shared Aurelia `IHttpClient` (injected via `@inject(IHttpClient)`) with `credentials: 'include'`. The `HttpClientService` interceptor handles XSRF tokens and 401 redirects automatically.

```ts
const response = await this.httpClient.fetch('/api/your-endpoint', {
    method: 'GET',
    credentials: 'include'
});
```

## Configuration Reference

### Connection String

Update `IdentityConnection` in `appsettings.json` to point to your SQL Server instance. The default uses LocalDB:

```
Server=(localdb)\\mssqllocaldb;Database=aurelia2-dotnet-identity;Trusted_Connection=True
```

### Bootstrap Role

Set `BootstrapRole` in `appsettings.json`, `appsettings.Development.json`, User Secrets, or deployment configuration to the email address that should receive the initial `Principal` role. Keep this value to a single email address; use the Admin User List page to assign additional admins after the bootstrap account is available.

### Email (SendGrid)

1. Add your SendGrid API key to [User Secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets): `{"SendGrid":{"Key":"YOUR_KEY"}}`.
2. Register your `IEmailSender` implementation in `Program.cs`.
3. When a key is present, Identity requires email confirmation before login.

### Antiforgery / XSRF

- Tokens are issued by `GET /api/account/antiforgery-token`.
- The client sends them back in the `X-XSRF-TOKEN` header.
- `POST`/`PUT`/`DELETE` actions are validated automatically.

### Security Headers

`SecurityHeadersMiddleware` sets `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`. Adjust the CSP if your app loads external scripts or styles.

### Logging

Serilog writes to `Logs/log.txt` with daily rolling files. The default level is `Information`; the Development profile overrides it to `Debug`.

## Client Scripts

Run from `src/client`:

| Command | Purpose |
|---------|---------|
| `npm run start` | Start Vite dev server (HTTPS, port 5002) |
| `npm run build` | Production build to `dist/` |
| `npm run serve` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |

## Publishing

### PowerShell script (recommended)

```
pwsh -File .\publish-self-contained.ps1 -Runtime win-x64
```

The script runs `npm install`, builds the client, publishes the backend as self-contained, and copies client assets into `wwwroot`. Output defaults to `artifacts\publish\self-contained\<Runtime>`.

Parameters: `-Configuration` (default `Release`), `-Runtime` (default `win-x64`), `-OutputDir` (optional exact path).

### Manual publish

```
cd src\client && npm install && npm run build
cd ..\Aurelia2.DotNet.Web.Api
dotnet publish -c Release --self-contained --runtime win-x64 --output <dir>
```

Then copy `src\client\dist\*` into `<dir>\wwwroot`.

### Running published output

From the publish output directory, run:

```
$env:ASPNETCORE_ENVIRONMENT = 'Production'; $env:ASPNETCORE_URLS = 'https://localhost:5001'; .\Aurelia2.DotNet.Web.Api.exe
```

Then open `https://localhost:5001`. The `Production` environment enables the SPA fallback to `wwwroot/index.html`. In PowerShell, environment variables must use the `$env:` syntax; `set ASPNETCORE_URLS=...` is `cmd.exe` syntax and does not configure the published process correctly.

## Before Going to Production

- Delete the **Create User Database** page and its endpoint (debug-only scaffolding).
- Replace the LocalDB connection string with your production database.
- Configure a real `IEmailSender` implementation if you need email confirmation.
- Review `SecurityHeadersMiddleware` and adjust the `Content-Security-Policy` for your deployment.
- Store secrets (connection strings, API keys) using User Secrets, environment variables, or a vault — never in `appsettings.json`.

## Development configuration precedence

When the API is running in a `DEBUG` build and the ASP.NET Core environment is `Development`, the application intentionally reloads `appsettings.json` and `appsettings.Development.json` after the default ASP.NET Core configuration providers are registered.

This means project-local JSON settings take precedence over machine-level environment variables during local debugging. This prevents global environment variables shared across projects from accidentally overriding local development settings such as `Turnstile:SecretKey`.

Effective local DEBUG Development precedence for duplicate keys is:

1. default ASP.NET Core configuration sources
2. environment variables
3. `appsettings.json`
4. `appsettings.Development.json`

Production/release configuration behavior is unchanged. Production secrets should continue to come from environment variables or the deployment environment rather than checked-in JSON files.

## License

[MIT](LICENSE)
