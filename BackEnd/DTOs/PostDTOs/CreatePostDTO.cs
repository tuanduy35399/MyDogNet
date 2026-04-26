using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTOs.PostDTOs
{
    public class CreatePostDTO
    {
        [Required]
        public string Title { get; set; }
        [Required]
        public string Content { get; set; }

        public string? Thumbnail { get; set; }
     
    }
}
