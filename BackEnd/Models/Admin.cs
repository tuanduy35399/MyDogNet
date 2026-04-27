using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackEnd.Models
{
    [Table("Admins")]
    public class Admin : IdentityUser<int>
    {

        public string? Describe { get; set; }
        public string? Avatar { get; set; }
        public string? BackGroundImg { get; set; }
        public List<Post>? Posts { get; set; }  //navigation property
        
    }
}
