using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTOs.AdminDTOs
{
    public class AllAccounts
    {
        [Required]
        public  string Id { get; set; }
        public string UserName { get; set; }
    }
}
