using Aurelia2.DotNet.Web.Api.Authorization;
using Aurelia2.DotNet.Web.Api.Data;
using Aurelia2.DotNet.Web.Api.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
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
        private readonly RoleManager<IdentityRole> roleManager;
        private readonly IUserStore<IdentityUser> userStore;
        private readonly IUserEmailStore<IdentityUser> emailStore;
        private readonly ILogger<AccountController> logger;
        private readonly IEmailSender emailSender;
        private readonly IAntiforgery antiforgery;
        private readonly TurnstileVerificationService turnstileService;
        private readonly IConfiguration configuration;
        private readonly IMemoryCache memoryCache;


        public AccountController(
            ApplicationDbContext context,
            UserManager<IdentityUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IUserStore<IdentityUser> userStore,
            SignInManager<IdentityUser> signInManager,
            ILogger<AccountController> logger,
            IEmailSender emailSender,
            IAntiforgery antiforgery,
            TurnstileVerificationService turnstileService,
            IConfiguration configuration,
            IMemoryCache memoryCache)
        {
            this.context = context;
            this.userManager = userManager;
            this.roleManager = roleManager;
            this.userStore = userStore;
            emailStore = GetEmailStore();
            this.signInManager = signInManager;
            this.logger = logger;
            this.emailSender = emailSender;
            this.antiforgery = antiforgery;
            this.turnstileService = turnstileService;
            this.configuration = configuration;
            this.memoryCache = memoryCache;
        }

        #if DEBUG
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
                logger.LogError(ex, "An error occurred while applying migrations.");
                return StatusCode(500, "An error occurred while applying migrations.");
            }
        }
#endif

        [HttpGet("CurrentUser")]
        public async Task<IActionResult> CurrentUser()
        {
            var isAuthenticated = User?.Identity?.IsAuthenticated ?? false;
            var emailConfirmationEnabled = userManager.Options.SignIn.RequireConfirmedAccount;
            string? role = null;

            if (isAuthenticated)
            {
                var user = await userManager.GetUserAsync(User);
                if (user is not null)
                {
                    var roles = await userManager.GetRolesAsync(user);
                    role = RoleExtensions.GetHighestRoleName(roles);
                    var claimRole = RoleExtensions.GetHighestRoleName(User.FindAll(ClaimTypes.Role).Select(claim => claim.Value));

                    if (NeedsSessionRepair(user, role))
                    {
                        await EnsureClaimsAsync(user);
                        roles = await userManager.GetRolesAsync(user);
                        role = RoleExtensions.GetHighestRoleName(roles);
                        await signInManager.RefreshSignInAsync(user);
                    }
                }
            }

            return Ok(CreateCurrentUserResponse(isAuthenticated, role));
        }

        private object CreateCurrentUserResponse(bool isAuthenticated, string? role) =>
            new
            {
                isAuthenticated,
                role,
                emailConfirmationEnabled = userManager.Options.SignIn.RequireConfirmedAccount,
                roleHierarchy = RoleExtensions.Names()
            };

        private async Task<object> CreateCurrentUserResponseAsync(IdentityUser user)
        {
            var role = await GetUserRoleAsync(user);

            return CreateCurrentUserResponse(true, role);
        }

        private async Task<string?> GetUserRoleAsync(IdentityUser user)
        {
            var roles = await userManager.GetRolesAsync(user);
            return RoleExtensions.GetHighestRoleName(roles);
        }

        private bool NeedsSessionRepair(IdentityUser user, string? role)
        {
            var claimRole = RoleExtensions.GetHighestRoleName(User.FindAll(ClaimTypes.Role).Select(claim => claim.Value));

            return role is null
                || !string.Equals(role, claimRole, StringComparison.Ordinal)
                || (!userManager.Options.SignIn.RequireConfirmedAccount && !user.EmailConfirmed);
        }

        [HttpGet("Users")]
        [Authorize(Policy = Policy.AdminAccess)]
        public async Task<IActionResult> GetUsers()
        {
            var currentUserHost = User.FindFirstValue("Host");

            var users = await userManager.Users
                .OrderBy(u => u.Email)
                .ToListAsync();

            var userModels = new List<object>(users.Count);
            foreach (var user in users)
            {
                var email = user.Email ?? string.Empty;
                var domain = email.Contains('@') ? email.Split('@')[1] : string.Empty;
                var role = await GetUserRoleAsync(user);

                userModels.Add(new
                {
                    id = user.Id,
                    email,
                    role,
                    domain,
                    emailConfirmed = user.EmailConfirmed,
                    lockoutEnabled = user.LockoutEnabled,
                    twoFactorEnabled = user.TwoFactorEnabled,
                    isLockedOut = user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTimeOffset.UtcNow,
                    isInCurrentDomain = !string.IsNullOrWhiteSpace(currentUserHost) && string.Equals(domain, currentUserHost, StringComparison.OrdinalIgnoreCase)
                });
            }

            return Ok(userModels);
        }

        [HttpDelete("Users/{userId}")]
        [Authorize(Policy = Policy.AdminAccess)]
        public async Task<IActionResult> DeleteUser(string userId)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return NotFound();
            }

            var result = await userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors.Select(error => error.Description).ToArray());
            }

            return Ok();
        }

        [HttpPost("Users/{userId}/role")]
        [Authorize(Policy = Policy.AdminAccess)]
        public async Task<IActionResult> UpdateUserRole(string userId, [FromBody] UpdateUserRoleViewModel model)
        {
            if (!RoleExtensions.TryParseName(model.Role, out var role))
            {
                return BadRequest(new[] { "Invalid role." });
            }

            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return NotFound();
            }

            await SetUserRoleAsync(user, role.Name());

            if (string.Equals(user.Id, userManager.GetUserId(User), StringComparison.Ordinal))
            {
                await signInManager.RefreshSignInAsync(user);
            }

            return Ok(new { role = role.Name() });
        }

        [HttpPost("Users/{userId}/confirm-email")]
        [Authorize(Policy = Policy.AdminAccess)]
        public async Task<IActionResult> AdminConfirmEmail(string userId)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return NotFound();
            }

            if (user.EmailConfirmed)
            {
                return Ok();
            }

            user.EmailConfirmed = true;
            var result = await userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                return BadRequest(result.Errors.Select(error => error.Description).ToArray());
            }

            return Ok();
        }

        [HttpPost("Users/{userId}/reset-lockout")]
        [Authorize(Policy = Policy.AdminAccess)]
        public async Task<IActionResult> ResetLockout(string userId)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return NotFound();
            }

            var result = await userManager.SetLockoutEndDateAsync(user, null);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors.Select(error => error.Description).ToArray());
            }

            await userManager.ResetAccessFailedCountAsync(user);
            return Ok();
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
                var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();
                var turnstileValid = await turnstileService.VerifyTokenAsync(model.TurnstileToken, remoteIp);
                if (!turnstileValid)
                {
                    ModelState.AddModelError(string.Empty, "CAPTCHA verification failed. Please try again.");
                    var captchaErrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToArray();
                    return BadRequest(captchaErrors);
                }

                var result = await signInManager.PasswordSignInAsync(model.Email, model.Password, model.RememberMe, lockoutOnFailure: true);
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

                    return Ok(await CreateCurrentUserResponseAsync(user));
                }
                if (result.IsLockedOut)
                {
                    var message = "User account is locked out.";
                    logger.LogWarning("A user account is locked out.");
                    return BadRequest(new[] { message });
                }
                if (result.IsNotAllowed)
                {
                    return BadRequest(new[] { "Email confirmation is required before signing in." });
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
                var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();
                var turnstileValid = await turnstileService.VerifyTokenAsync(model.TurnstileToken, remoteIp);
                if (!turnstileValid)
                {
                    ModelState.AddModelError(string.Empty, "CAPTCHA verification failed. Please try again.");
                    var captchaErrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToArray();
                    return BadRequest(captchaErrors);
                }

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

                    if (IsBootstrapUser(user) || !userManager.Options.SignIn.RequireConfirmedAccount)
                    {
                        user.EmailConfirmed = true;
                        var updateResult = await userManager.UpdateAsync(user);
                        if (!updateResult.Succeeded)
                        {
                            AddIdentityErrors(updateResult);
                            var updateErrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToArray();
                            return BadRequest(updateErrors);
                        }

                        await signInManager.SignInAsync(user, isPersistent: false);
                        return Ok(await CreateCurrentUserResponseAsync(user));
                    }

                    if (userManager.Options.SignIn.RequireConfirmedAccount)
                    {
                        await SendConfirmationEmailAsync(user, model.ConfirmEmailPage);

                        return Ok(CreateCurrentUserResponse(false, null));
                    }
                    else
                    {
                        await signInManager.SignInAsync(user, isPersistent: false);
                        return Ok(await CreateCurrentUserResponseAsync(user));
                    }
                }

                var existingRegistration = await TryHandleExistingUnconfirmedRegistrationAsync(model);
                if (existingRegistration.handled)
                {
                    return existingRegistration.signedInUser is null
                        ? Ok(CreateCurrentUserResponse(false, null))
                        : Ok(await CreateCurrentUserResponseAsync(existingRegistration.signedInUser));
                }

                AddIdentityErrors(result);
            }

            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToArray();

            return BadRequest(errors);
        }

        private void AddIdentityErrors(IdentityResult result)
        {
            foreach (var error in result.Errors)
            {
                if (error.Code == "DuplicateUserName" || error.Code == "DuplicateEmail")
                {
                    ModelState.AddModelError(nameof(RegisterViewModel.Email), "Registration is not available for this email address.");
                }
                else if (error.Code == "PasswordTooShort")
                {
                    ModelState.AddModelError(nameof(RegisterViewModel.Password), "Password is too short.");
                }
                else if (error.Code == "PasswordRequiresNonAlphanumeric")
                {
                    ModelState.AddModelError(nameof(RegisterViewModel.Password), "Password must contain a non-alphanumeric character.");
                }
                else if (error.Code == "PasswordRequiresDigit")
                {
                    ModelState.AddModelError(nameof(RegisterViewModel.Password), "Password must contain a digit.");
                }
                else if (error.Code == "PasswordRequiresUpper")
                {
                    ModelState.AddModelError(nameof(RegisterViewModel.Password), "Password must contain an uppercase letter.");
                }
                else if (error.Code == "PasswordRequiresLower")
                {
                    ModelState.AddModelError(nameof(RegisterViewModel.Password), "Password must contain a lowercase letter.");
                }
                else
                {
                    ModelState.AddModelError(string.Empty, "Registration failed. Please check your input.");
                }
            }
        }

        private async Task<(bool handled, IdentityUser? signedInUser)> TryHandleExistingUnconfirmedRegistrationAsync(RegisterViewModel model)
        {
            var existingUser = await userManager.FindByEmailAsync(model.Email);
            if (existingUser is null || await userManager.IsEmailConfirmedAsync(existingUser))
            {
                return (false, null);
            }

            if (!userManager.Options.SignIn.RequireConfirmedAccount)
            {
                return (false, null);
            }

            if (IsBootstrapUser(existingUser))
            {
                await EnsureClaimsAsync(existingUser);
                existingUser.EmailConfirmed = true;
                var updateResult = await userManager.UpdateAsync(existingUser);
                if (!updateResult.Succeeded)
                {
                    AddIdentityErrors(updateResult);
                    return (false, null);
                }

                await signInManager.SignInAsync(existingUser, isPersistent: false);
                return (true, existingUser);
            }

            await SendConfirmationEmailAsync(existingUser, model.ConfirmEmailPage);
            return (true, null);
        }

        private async Task SendConfirmationEmailAsync(IdentityUser user, string confirmEmailPage)
        {
            var email = user.Email ?? throw new InvalidOperationException("User email is required to send a confirmation email.");
            var userId = await userManager.GetUserIdAsync(user);
            var code = await userManager.GenerateEmailConfirmationTokenAsync(user);
            code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));
            var callbackUrl = confirmEmailPage + "/" + userId + "/" + code;

            await emailSender.SendEmailAsync(email, "Confirm your email",
                $"Please confirm your account by <a href='{HtmlEncoder.Default.Encode(callbackUrl)}'>clicking here</a>.");
        }

        [HttpPost("ResendConfirmationEmail")]
        [AllowAnonymous]
        public async Task<IActionResult> ResendConfirmationEmail([FromBody] ResendConfirmationEmailViewModel model)
        {
            if (!userManager.Options.SignIn.RequireConfirmedAccount)
            {
                return Ok();
            }

            if (!ModelState.IsValid)
            {
                var modelErrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToArray();
                return BadRequest(modelErrors);
            }

            var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();
            var turnstileValid = await turnstileService.VerifyTokenAsync(model.TurnstileToken, remoteIp);
            if (!turnstileValid)
            {
                ModelState.AddModelError(string.Empty, "CAPTCHA verification failed. Please try again.");
                var captchaErrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToArray();
                return BadRequest(captchaErrors);
            }

            if (IsConfirmationEmailThrottled(model.Email, remoteIp))
            {
                return Ok();
            }

            var user = await userManager.FindByEmailAsync(model.Email);
            if (user is null || await userManager.IsEmailConfirmedAsync(user))
            {
                return Ok();
            }

            SetConfirmationEmailThrottle(model.Email, remoteIp);
            await SendConfirmationEmailAsync(user, model.ConfirmEmailPage);

            return Ok();
        }

        private bool IsConfirmationEmailThrottled(string email, string? remoteIp)
        {
            return memoryCache.TryGetValue(GetConfirmationEmailThrottleKey(email), out _)
                || (!string.IsNullOrWhiteSpace(remoteIp) && memoryCache.TryGetValue(GetConfirmationIpThrottleKey(remoteIp), out _));
        }

        private void SetConfirmationEmailThrottle(string email, string? remoteIp)
        {
            memoryCache.Set(GetConfirmationEmailThrottleKey(email), true, TimeSpan.FromMinutes(30));

            if (!string.IsNullOrWhiteSpace(remoteIp))
            {
                memoryCache.Set(GetConfirmationIpThrottleKey(remoteIp), true, TimeSpan.FromMinutes(5));
            }
        }

        private string GetConfirmationEmailThrottleKey(string email) =>
            $"confirmation-email:{userManager.NormalizeEmail(email)}";

        private static string GetConfirmationIpThrottleKey(string remoteIp) =>
            $"confirmation-email-ip:{remoteIp}";

        [HttpGet("ConfirmEmail")]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmEmail(string userId, string code)
        {
            if (userId == null || code == null)
            {
                return ValidationProblem();
            }

            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return BadRequest();
            }

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
            var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();
            var turnstileValid = await turnstileService.VerifyTokenAsync(model.TurnstileToken, remoteIp);
            if (!turnstileValid)
            {
                ModelState.AddModelError(string.Empty, "CAPTCHA verification failed. Please try again.");
                var captchaErrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToArray();
                return BadRequest(captchaErrors);
            }

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

        [HttpPost("AdminRequestPasswordReset")]
        [Authorize(Policy = Policy.AdminAccess)]
        public async Task<IActionResult> AdminRequestPasswordReset([FromBody] RequestPasswordResetViewModel model)
        {
            var user = await userManager.FindByEmailAsync(model.Email);
            if (user == null || !(await userManager.IsEmailConfirmedAsync(user)))
            {
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

            var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();
            var turnstileValid = await turnstileService.VerifyTokenAsync(model.TurnstileToken, remoteIp);
            if (!turnstileValid)
            {
                ModelState.AddModelError(string.Empty, "CAPTCHA verification failed. Please try again.");
                var captchaErrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToArray();
                return BadRequest(captchaErrors);
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
            await EnsureRoleAsync(user);

            if (!userManager.Options.SignIn.RequireConfirmedAccount && !user.EmailConfirmed)
            {
                user.EmailConfirmed = true;
                var result = await userManager.UpdateAsync(user);
                if (!result.Succeeded)
                {
                    var errors = string.Join(", ", result.Errors.Select(error => error.Description));
                    throw new InvalidOperationException($"Failed to auto-confirm '{user.Email}': {errors}");
                }
            }

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

        private async Task EnsureRoleAsync(IdentityUser user)
        {
            var roleNames = RoleExtensions.Names();
            var existingRoles = await userManager.GetRolesAsync(user);
            if (existingRoles.Any(roleNames.Contains))
            {
                return;
            }

            var role = IsBootstrapUser(user)
                ? Role.Principal.Name()
                : Role.RegisteredUser.Name();

            await SetUserRoleAsync(user, role);
        }

        private async Task SetUserRoleAsync(IdentityUser user, string role)
        {
            var roleNames = RoleExtensions.Names();
            var existingRoles = await userManager.GetRolesAsync(user);
            var appRoles = existingRoles.Where(roleNames.Contains).ToArray();

            if (appRoles.Length > 0)
            {
                var removeRoleResult = await userManager.RemoveFromRolesAsync(user, appRoles);
                if (!removeRoleResult.Succeeded)
                {
                    var errors = string.Join(", ", removeRoleResult.Errors.Select(error => error.Description));
                    throw new InvalidOperationException($"Failed to remove roles from '{user.Email}': {errors}");
                }
            }

            var addRoleResult = await userManager.AddToRoleAsync(user, role);
            if (!addRoleResult.Succeeded)
            {
                var errors = string.Join(", ", addRoleResult.Errors.Select(error => error.Description));
                throw new InvalidOperationException($"Failed to assign role '{role}' to '{user.Email}': {errors}");
            }
        }

        private bool IsBootstrapUser(IdentityUser user)
        {
            var bootstrapEmail = configuration["BootstrapRole"]?.Trim();

            return !string.IsNullOrWhiteSpace(bootstrapEmail)
                && string.Equals(user.Email, bootstrapEmail, StringComparison.OrdinalIgnoreCase);
        }
    }
}