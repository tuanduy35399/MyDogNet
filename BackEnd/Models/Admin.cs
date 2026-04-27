using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackEnd.Models
{
    [Table("Admins")]
    public class Admin : IdentityUser<int>
    {
        [Key]
        [Required]
        public int Id { get; set; }
        [Required]
        public string Name { get; set; }
        public string PasswordHash { get; set; } //nên public nhưng để trong DTO để nó loại khỏi API
        public string? Describe { get; set; }
        public string? Avatar { get; set; }
        public string? BackGroundImg { get; set; }
        public bool VerifyPassword(string pass) => pass == PasswordHash;
        public List<Post>? Posts { get; set; }  //navigation property
        
    }
}
