using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTOs.AdminDTOs
{
    public class SignUpDTO
    {
        [Required]
        public string UserName { get; set; }= null!;
        public string? Describe { get; set; }
        public string Avatar { get; set; } = "./imgs/default_avatar.jpg";
        public string BackGroundImg { get; set; } = "./imgs/default_background.jpg";
        [Required]
        public string Password { get; set; } = null!;
        [Required]
        [Compare("Password")]
        public string ConfirmPassword { get; set; }=null!;
    }
}
