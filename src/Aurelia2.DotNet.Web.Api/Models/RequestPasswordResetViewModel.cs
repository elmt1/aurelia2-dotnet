using System.ComponentModel.DataAnnotations;

namespace Aurelia2.DotNet.Web.Api.Models
{
    public class RequestPasswordResetViewModel
    {
        [Required]
        [EmailAddress]
        public required string Email { get; set; }

        [DataType(DataType.Text)]
        public required string PasswordResetPage { get; set; }
    }
}
