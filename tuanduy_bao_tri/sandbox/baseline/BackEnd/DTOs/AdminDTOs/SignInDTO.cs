using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTOs.AdminDTOs
{
    public class SignInDTO
    {
        [Required]
        public string UserName { get; set; } = null!;
        [Required]
        public string Password { get; set; } = null!;
    }
}
