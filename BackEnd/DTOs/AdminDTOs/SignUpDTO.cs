using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTOs.AdminDTOs
{
    public class SignUpDTO
    {
        [Required]
        public string Name { get; set; }
        [Required]
        public string Describe { get; set; }
        public string Avatar { get; set; } = "./imgs/default_avatar.jpg";
        public string BackGroundImg { get; set; } = "./imgs/default_background.jpg";
        public string Password { get; set; }
        public string ConfirmPassword { get; set; }
    }
}
