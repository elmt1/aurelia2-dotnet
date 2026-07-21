using System.ComponentModel.DataAnnotations;

namespace Aurelia2.DotNet.Web.Api.Models
{
    public class ResendConfirmationEmailViewModel
    {
        [Required]
        [EmailAddress]
        public required string Email { get; set; }

        [DataType(DataType.Text)]
        public required string ConfirmEmailPage { get; set; }

        [Required]
        public required string TurnstileToken { get; set; }
    }
}
