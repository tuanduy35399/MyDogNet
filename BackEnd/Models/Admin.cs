using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackEnd.Models
{
    [Table("Admins")]
    public class Admin
    {
        [Key]
        [Required]
        private int Id { get; set; }
        [Required]
        public string Name { get; set; }
        public string Describe { get; set; }
        public string Avatar { get; set; }
        public string BackGroundImg { get; set; }

        public List<Post> MyProperty { get; set; }
        public bool VerifyPassword { get; set; }
    }
}
