using System.ComponentModel.DataAnnotations;

namespace Aurelia2.DotNet.Web.Api.Models
{
    public class UpdateUserRoleViewModel
    {
        [Required]
        public required string Role { get; set; }
    }
}
