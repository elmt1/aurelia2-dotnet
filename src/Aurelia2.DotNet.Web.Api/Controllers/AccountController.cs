using Aurelia2.DotNet.Web.Api.Data;
using Aurelia2.DotNet.Web.Api.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;

namespace Aurelia2.DotNet.Web.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly ApplicationDbContext context;
        private readonly SignInManager<IdentityUser> signInManager;
        private readonly UserManager<IdentityUser> userManager;
        private readonly IUserStore<IdentityUser> userStore;
        private readonly IUserEmailStore<IdentityUser> emailStore;
        private readonly ILogger<AccountController> logger;
        private readonly IEmailSender emailSender;
        private readonly IAntiforgery antiforgery;


        public AccountController(
            ApplicationDbContext context,
            UserManager<IdentityUser> userManager,
            IUserStore<IdentityUser> userStore,
            SignInManager<IdentityUser> signInManager,
            ILogger<AccountController> logger,
            IEmailSender emailSender,
            IAntiforgery antiforgery)
        {
            this.context = context;
            this.userManager = userManager;
            this.userStore = userStore;
            emailStore = GetEmailStore();
            this.signInManager = signInManager;
            this.logger = logger;
            this.emailSender = emailSender;
            this.antiforgery = antiforgery;
        }

        /// <summary>Runs the migrations, this is ONLY FOR TESTING.</summary>
        [HttpPost("CreateUserDatabase")]
        [AllowAnonymous]
        public IActionResult CreateUserDatabase()
        {
            try
            {
                context.Database.Migrate();
                return Ok("Database migrations applied successfully.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred while applying migrations: {ex.Message}");
            }
        }

        [HttpGet("IsAuthenticated")]
        public IActionResult IsAuthenticated()
        {
            var isAuthenticated = User?.Identity?.IsAuthenticated ?? false;
            return Ok(new { isAuthenticated });
        }

        [HttpGet("antiforgery-token")]
        [AllowAnonymous]
        public IActionResult AntiforgeryToken()
        {
            var tokens = antiforgery.GetAndStoreTokens(HttpContext);
            return Ok(new { token = tokens.RequestToken });
        }

        [HttpPost("Login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login(LoginViewModel model)
        {
            if (ModelState.IsValid)
            {
                var result = await signInManager.PasswordSignInAsync(model.Email, model.Password, model.RememberMe, lockoutOnFailure: false);
                if (result.Succeeded)
                {
                    var user = await userManager.FindByEmailAsync(model.Email);
                    if (user is null)
                    {
                        var error = new[] { "Invalid login attempt." };
                        return BadRequest(error);
                    }

                    if (logger.IsEnabled(LogLevel.Information))
                    {
                        logger.LogInformation("User logged in.");
                    }

                    await EnsureClaimsAsync(user);
                    await signInManager.RefreshSignInAsync(user);

                    if (logger.IsEnabled(LogLevel.Information))
                    {
                        logger.LogInformation("User claims set.");
                    }

                    return this.Content("Login Success", "application/json");
                }
                if (result.IsLockedOut)
                {
                    var message = "User account is locked out.";
                    logger.LogWarning("A user account is locked out.");
                    return BadRequest(new[] { message });
                }
                else
                {
                    ModelState.AddModelError(string.Empty, "Invalid login attempt.");
                    var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToArray();
                    return BadRequest(errors);
                }
            }

            // If we got this far, something failed, redisplay form
            var modelErrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToArray();
            return BadRequest(modelErrors);
        }

        [HttpPost("Logout")]
        public async Task<IActionResult> Logout()
        {
            await signInManager.SignOutAsync();
            return Ok();
        }

        [HttpPost("Register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register(RegisterViewModel model)
        {
            if (ModelState.IsValid)
            {
                var user = CreateUser();

                await userStore.SetUserNameAsync(user, model.Email, CancellationToken.None);
                await emailStore.SetEmailAsync(user, model.Email, CancellationToken.None);
                var result = await userManager.CreateAsync(user, model.Password);

                if (result.Succeeded)
                {
                    await EnsureClaimsAsync(user);

                    if (logger.IsEnabled(LogLevel.Information))
                    {
                        logger.LogInformation("Created new user account.");
                    }

                    if (userManager.Options.SignIn.RequireConfirmedAccount)
                    {
                        var userId = await userManager.GetUserIdAsync(user);
                        var code = await userManager.GenerateEmailConfirmationTokenAsync(user);
                        code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));
                        var callbackUrl = model.ConfirmEmailPage + "/" + userId + "/" + code;

                        await emailSender.SendEmailAsync(model.Email, "Confirm your email",
                            $"Please confirm your account by <a href='{HtmlEncoder.Default.Encode(callbackUrl)}'>clicking here</a>.");

                        return Ok();
                    }
                    else
                    {
                        await signInManager.SignInAsync(user, isPersistent: false);
                        return Ok();
                    }
                }

                foreach (var error in result.Errors)
                {
                    ModelState.AddModelError(string.Empty, error.Description);
                }
            }

            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToArray();

            return BadRequest(errors);
        }

        [HttpGet("ConfirmEmail")]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmEmail(string userId, string code)
        {
            if (userId == null || code == null)
            {
                return ValidationProblem();
            }

            var user = await userManager.FindByIdAsync(userId)
                ?? throw new ApplicationException($"Unable to load user with ID '{userId}'.");

            // Decode the code
            var decodedCode = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(code));

            var result = await userManager.ConfirmEmailAsync(user, decodedCode);

            if (result.Succeeded)
            {
                return Ok();
            }
            else
            {
                return BadRequest();
            }
        }
        [HttpPost("RequestPasswordReset")]
        [AllowAnonymous]
        public async Task<IActionResult> RequestPasswordReset([FromBody] RequestPasswordResetViewModel model)
        {
            var user = await userManager.FindByEmailAsync(model.Email);
            if (user == null || !(await userManager.IsEmailConfirmedAsync(user)))
            {
                // Don't reveal that the user does not exist or is not confirmed
                return Ok();
            }

            var userId = await userManager.GetUserIdAsync(user);
            var code = await userManager.GeneratePasswordResetTokenAsync(user);
            code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));
            var callbackUrl = model.PasswordResetPage + "/" + userId + "/" + code;

            await emailSender.SendEmailAsync(
                model.Email,
                "Reset Password",
                $"Please reset your password by <a href='{HtmlEncoder.Default.Encode(callbackUrl)}'>clicking here</a>.");

            return Ok();
        }

        [HttpPost("ResetPassword")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var user = await userManager.FindByIdAsync(model.UserId);
            if (user == null)
            {
                // Don't reveal that the user does not exist
                return Ok();
            }

            var decodedCode = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(model.Code));
            var result = await userManager.ResetPasswordAsync(user, decodedCode, model.NewPassword);

            if (result.Succeeded)
            {
                return Ok();
            }

            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(string.Empty, error.Description);
            }

            return BadRequest(ModelState);
        }

        /// <summary>Creates the user.</summary>
        /// <returns>
        ///   <br />
        /// </returns>
        /// <exception cref="System.InvalidOperationException">
        /// Can't create an instance of "{nameof(IdentityUser)}".
        /// </exception>
        private IdentityUser CreateUser()
        {
            try
            {
                return Activator.CreateInstance<IdentityUser>();
            }
            catch
            {
                throw new InvalidOperationException($"Can't create an instance of \"{nameof(IdentityUser)}\".");
            }
        }

        private IUserEmailStore<IdentityUser> GetEmailStore()
        {
            if (!userManager.SupportsUserEmail)
            {
                throw new NotSupportedException("The default UI requires a user store with email support.");
            }
            return (IUserEmailStore<IdentityUser>)userStore;
        }

        private async Task EnsureClaimsAsync(IdentityUser user)
        {
            if (user.Email is not null)
            {
                var claims = await this.userManager.GetClaimsAsync(user);
                var host = user.Email.Split('@')[1];
                var customer = host[..host.LastIndexOf('.')];

                if (!claims.Any(c => c.Type == "Host"))
                {
                    await this.userManager.AddClaimAsync(user, new Claim("Host", host));
                }
                if (!claims.Any(c => c.Type == "VerifiedCustomer"))
                {
                    await this.userManager.AddClaimAsync(user, new Claim("VerifiedCustomer", customer));
                }
            }
        }
    }
}