using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackEnd.Models
{
    [Table("Posts")]
    public class Post
    {
        [Key]
        [Required]
        private int Id { get; set; }
        [Required]
        public string Title { get; set; }
        [Required]
        public string Content { get; set; }
        public List<string> ImageUrls { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        [Required]
        private bool IsPublish { get; set; } = false;
        public int ViewCount { get; set; }

        protected void IncreaseView() { ViewCount++; }
        protected bool Publish() => IsPublish = true;

    }
}
