using System.ComponentModel.DataAnnotations;

namespace Aurelia2.DotNet.Web.Models
{
    public class ResetPasswordViewModel
    {
        [Required]
        public required string UserId { get; set; }

        [Required]
        public required string Code { get; set; }

        [Required]
        [StringLength(100, ErrorMessage = "The {0} must be at least {2} and at max {1} characters long.", MinimumLength = 6)]
        [DataType(DataType.Password)]
        public required string NewPassword { get; set; }

        [DataType(DataType.Password)]
        [Compare("NewPassword", ErrorMessage = "The new password and confirmation password do not match.")]
        public required string ConfirmPassword { get; set; }
    }
}
