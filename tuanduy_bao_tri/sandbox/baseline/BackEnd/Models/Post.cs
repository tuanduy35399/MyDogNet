using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackEnd.Models
{
    [Table("Posts")]
    public class Post
    {
        [Key]
        [Required]
        public int Id { get; set; }
        [Required]
        public string Title { get; set; }
        [Required]
        public string Content { get; set; }
        public string? Thumbnail { get; set; }
        public DateTime CreatedAt { get; set; }= DateTime.UtcNow; //ban đầu thiếu giá trị mặc định
        public DateTime UpdatedAt { get; set; }= DateTime.UtcNow;//ban đầu thiếu giá trị mặc định
        [Required]
        public bool IsPublished { get; set; } = false;
        public int ViewCount { get; set; }

        public void IncreaseView() { ViewCount++; }
        public void Publish() => IsPublished = true; //không nên trả về cái gì
        [ForeignKey("Admin")]
        public string AuthorId { get; set; } //[NavigationPropertyName]+Id  thì EF core sẽ auto hiểu là FK và nối với AdminId
        public Admin? Author { get; set; } //navigation property
        //Quan trọng chỗ tên [NavigationPropertyName] phải giống với navigation property ở dưới

    }
}
