using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTOs.AdminDTOs
{
    public class SignInDTO
    {
        [Required]
        public string Name { get; set; } = null!;
        [Required]
        public string Password { get; set; } = null!;
    }
}
