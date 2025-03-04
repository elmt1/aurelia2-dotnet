# aurelia2-dotnet

## Project Structure

- **ClientApp**: Contains the Aurelia 2 client application.
- **Controllers**: Contains the ASP.NET Core API controllers.
- **Models**: Contains the data models and view models.
- **Data**: Contains the Entity Framework Core data context and migrations.

## Packages Summary

- **[@aurelia/router-lite](https://www.npmjs.com/package/@aurelia/router-lite)**: Router for Aurelia applications.
- **[@fortawesome/fontawesome-free](https://www.npmjs.com/package/@fortawesome/fontawesome-free)**: Free set of Font Awesome icons.
- **[@popperjs/core](https://www.npmjs.com/package/@popperjs/core)**: Popper.js for tooltips and popovers.
- **[aurelia](https://www.npmjs.com/package/aurelia)**: Aurelia framework.
- **[bootstrap](https://www.npmjs.com/package/bootstrap)**: Bootstrap CSS framework.
- **[vite](https://www.npmjs.com/package/vite)**: Packaging and development-time server.
- **[vite-plugin-node-polyfills](https://www.npmjs.com/package/vite-plugin-node-polyfills)**: Node.js polyfills for Vite.

## Project-Specific Configuration

### Aurelia View Configuration

The routes and menus are defined in routes.ts and menu-definitions.ts. The nav-menu element will build a 
two-level bootstrap navigation menu using those definitions.

### `vite.config.ts`

Configures Vite for the Aurelia 2 application

### `tsconfig.json`

Specifies the TypeScript compilation settings:
  - Targeting `ES2020` and using `moduleResolution: "node"`.
  - Skips library checks (`skipLibCheck`).
  - Excludes emitting compiled files in favor of Vite bundling.


## Backend Requirements

### Authentication Database

The project uses ASP.NET Core Identity for authentication. Ensure you have a SQL Server instance running 
and update the connection string in `appsettings.json`.

### Run Database Migrations

You can create the user database while running the application using the Create User Database page available 
from the configuration dropdown menu. That will run migrations from the AccountController. The Create User 
Database page and all related code should be deleted before using this template in a production environment.

You can also install the Entity Framework Design'time package and run migrations from the command line.

### Email Client Setup with SendGrid

1. Log in or sign up for a [SendGrid](https://sendgrid.com/) account.
2. Obtain your API key.
3. Install Package: Add the SendGrid NuGet package to your project.
4. Update the SendGrid section in `appsettings.json`:
   {
     "SendGrid": {
       "Key": "YOUR_SENDGRID_API_KEY"
     }
   }
5. Email Service: Create a service to handle sending emails using SendGrid.
6. Register Service: Register the EmailSender service in the Program.cs file:
builder.Services.AddTransient<IEmailSender, EmailSender>();
7. Use the EmailSender service to send emails in the AccountController.cs file.

### `package.json` Scripts

- **prestart**: Runs `aspnetcore-https.js` to set up HTTPS.
- **start**: Copies `index.html` to the root, runs `replace-tags.js`, and starts Vite.
- **dev**: Same as `start`.
- **build**: Builds the project using Vite.
- **serve**: Previews the built project using Vite.

### `replace-tags.js`

Converts the production-ready `index.html` to a development version by replacing the production 
script and link tags with the development script tag.


### `aspnetcore-https.js`

Sets up HTTPS for the application using the ASP.NET Core HTTPS certificate.

## Publishing the Project

To create a published version of the website, use the following commands from the root of the 
Aurelia2.DotNet.Web project:

dotnet publish

Creates a published version of the website using dotnet publish and vite build. The output can be run using 
the following from a command line in the root of the publish target directory:

set ASPNETCORE_URLS=https://localhost:5001
dotnet Aurelia2.DotNet.Web.dll

