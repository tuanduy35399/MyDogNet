using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackEnd.Models
{
    public class Admin : IdentityUser
    {

        public string? Describe { get; set; }
        public string? Avatar { get; set; }
        public string? BackGroundImg { get; set; }
        public List<Post>? Posts { get; set; }  //navigation property
        
    }
}
