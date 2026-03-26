# aurelia2-dotnet

## Project Structure

- `src\client`: Aurelia 2 client application built with Vite.
- `src\client\src\http-client`: Shared client HTTP infrastructure such as the configured Aurelia fetch client and XSRF handling.
- `src\Aurelia2.DotNet.Web.Api`: ASP.NET Core Web API and Identity host.
- `src\Aurelia2.DotNet.Web.Api\Controllers`: API controllers.
- `src\Aurelia2.DotNet.Web.Api\Models`: View models and related backend models.
- `src\Aurelia2.DotNet.Web.Api\Data`: Entity Framework Core context and migrations.

## Packages Summary

- **[@aurelia/router](https://www.npmjs.com/package/@aurelia/router)**: Router for Aurelia applications.
- **[@fortawesome/fontawesome-free](https://www.npmjs.com/package/@fortawesome/fontawesome-free)**: Free set of Font Awesome icons.
- **[@popperjs/core](https://www.npmjs.com/package/@popperjs/core)**: Popper.js for tooltips and popovers.
- **[aurelia](https://www.npmjs.com/package/aurelia)**: Aurelia framework.
- **[bootstrap](https://www.npmjs.com/package/bootstrap)**: Bootstrap CSS framework.
- **[vite](https://www.npmjs.com/package/vite)**: Packaging and development-time server.
- **[eslint](https://www.npmjs.com/package/eslint)**: JavaScript and TypeScript linting.
- **[typescript-eslint](https://typescript-eslint.io/)**: TypeScript-aware ESLint rules and parser support.

## Project-Specific Configuration

### Aurelia View Configuration

The routes and menus are defined in `src\client\src\routes.ts` and `src\client\src\nav-menu\menu-definitions.ts`. The `nav-menu` element builds a two-level Bootstrap navigation menu from those definitions.

### `vite.config.ts`

Configures Vite for the Aurelia 2 application, including:

- HTTPS using the ASP.NET Core development certificate.
- Dev server port `5002`.
- Proxying `/api` requests to the backend on `https://localhost:5001`.

### `tsconfig.json`

Specifies the TypeScript compilation settings:
  - Targeting `ES2022` and using `moduleResolution: "nodenext"`.
  - Skips library checks (`skipLibCheck`).
  - Excludes emitting compiled files in favor of Vite bundling.

### ESLint

The client uses ESLint with `typescript-eslint` via `src\client\eslint.config.mjs`.

Useful scripts:

- `npm run lint`
- `npm run lint:fix`

### Shared HTTP Client

The client uses `src\client\src\http-client\http-client-service.ts` to configure a shared Aurelia `IHttpClient` instance.

That service is responsible for:

- attaching the `X-XSRF-TOKEN` header to unsafe requests
- fetching antiforgery tokens from `GET /api/account/antiforgery-token`
- handling the first `401 Unauthorized` response centrally
- syncing login state and routing the client back to `login`


## Backend Requirements

### Authentication Database

The project uses ASP.NET Core Identity for authentication. Ensure you have a SQL Server instance running and update the connection string in `src\Aurelia2.DotNet.Web.Api\appsettings.json`.

### Run Database Migrations

You can create the user database while running the application using the Create User Database page available from the configuration dropdown menu. That runs migrations from `AccountController`.

The endpoint is now `POST /api/account/CreateUserDatabase`, so it is protected by antiforgery validation like the other unsafe API actions.

The Create User Database page and all related code should be deleted before using this template in a production environment.

You can also install the Entity Framework design-time package and run migrations from the command line.

### Email Client Setup with SendGrid

1. Log in or sign up for a [SendGrid](https://sendgrid.com/) account.
2. Obtain your API key.
3. Add the SendGrid integration used by your application.
4. Update the `SendGrid` section in `src\Aurelia2.DotNet.Web.Api\appsettings.json`:

   `{"SendGrid":{"Key":"YOUR_SENDGRID_API_KEY"}}`

5. Register your email sender implementation in `Program.cs`.
6. Use the configured sender from `AccountController`.

### Antiforgery / XSRF

The backend uses ASP.NET Core antiforgery protection for unsafe controller actions.

Current behavior:

- antiforgery request tokens are issued by `GET /api/account/antiforgery-token`
- the client sends the token back in the `X-XSRF-TOKEN` header
- unsafe API methods such as `POST` are validated automatically

This is important because the application uses cookie-based authentication.

## Running the Solution

### Visual Studio

Run the `Aurelia2.DotNet.Web.Api` profile.

Current development URLs:

- Backend: `https://localhost:5001`
- Client: `https://localhost:5002`

The backend startup profile opens the browser on `https://localhost:5002`.

In `Debug`, `Program.cs` starts the Aurelia client automatically by running `npm run start` from `src\client`.

If `package.json` or `package-lock.json` changed, the backend startup logic will run `npm install` before starting Vite.

When the first `401 Unauthorized` response is received by the client, the shared HTTP client resets login status and routes the user to the `login` page.

### Manual client commands

From `src\client`:

- `npm run start`
- `npm run build`
- `npm run serve`
- `npm run lint`
- `npm run lint:fix`

### `package.json` Scripts

- **prestart**: Runs `aspnetcore-https.js` to set up HTTPS.
- **start**: Starts the Vite development server.
- **lint**: Runs ESLint over the client TypeScript sources.
- **lint:fix**: Runs ESLint and applies safe automatic fixes.
- **build**: Builds the project using Vite.
- **serve**: Previews the built project using Vite.

### `index.html`

The client root `src\client\index.html` is the Vite entry page for development.

Navigation uses Aurelia router `load` bindings and client API calls use absolute `/api/...` paths so routes and requests resolve correctly from nested pages such as `product-list`.

### API Security Notes

- `GET /api/account/antiforgery-token` issues the current request token.
- Unsafe API calls are expected to use the shared configured `IHttpClient` so the XSRF header is attached automatically.
- `Login` refreshes the sign-in after claims are added so policy-based endpoints can succeed immediately after login.

### `aspnetcore-https.js`

Sets up HTTPS for the client using the ASP.NET Core HTTPS development certificate.

## Publishing the Project

Publish the backend from `src\Aurelia2.DotNet.Web.Api`.

### PowerShell publish script

The repository includes `publish-self-contained.ps1` at the repo root.

The script accepts these parameters:

- `-Configuration` default: `Release`
- `-Runtime` default: `win-x64`
- `-OutputDir` optional: exact final publish folder

The script will:

- run `npm install` in `src\client`
- build the Aurelia client with `npm run build`
- publish `Aurelia2.DotNet.Web.Api` as a self-contained deployment
- copy the client `dist` output into the published `wwwroot`

Example script usage:

`pwsh -File .\publish-self-contained.ps1 -Runtime win-x64`

`pwsh -File .\publish-self-contained.ps1 -Configuration Release -Runtime linux-x64`

`pwsh -File .\publish-self-contained.ps1 -Runtime win-x64 -OutputDir .\artifacts\custom-publish`

If `-OutputDir` is omitted, the final publish folder is:

`artifacts\publish\self-contained\<Runtime>`

For example, with the defaults, output goes to:

`artifacts\publish\self-contained\win-x64`

If `-OutputDir` is supplied, that path is used as the exact final publish folder.

For example:

`pwsh -File .\publish-self-contained.ps1 -Runtime win-x64 -OutputDir C:\temp\publish`

publishes directly to:

`C:\temp\publish`

### Direct `dotnet publish`

If you do **not** want to use the script, you can publish the backend directly instead.

These commands only publish the API project. They do **not** run the client build or copy client assets for you.

`dotnet publish -c Release .\Aurelia2.DotNet.Web.Api.csproj`

or

`dotnet publish -c Release --self-contained --output <output-dir> --runtime win-x64 .\Aurelia2.DotNet.Web.Api.csproj`

### Important

The project file no longer runs `npm install` or `npm run build` during publish. If you want to deploy the Aurelia client as static files with the backend, build the client separately from `src\client` and include the generated assets as part of your deployment process.

### Running published output

Set the backend URL before starting the published app:

`set ASPNETCORE_URLS=https://localhost:5001`

For the in-place version, run:

`dotnet .\bin\Release\net10.0\Aurelia2.DotNet.Web.Api.dll`

For the published output directory, run:

`dotnet <output-dir>\Aurelia2.DotNet.Web.Api.dll`

API base URL: `https://localhost:5001`
