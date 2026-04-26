namespace BackEnd.DTOs.PostDTOs
{
    public class ReadPostDTO
    {
        public string Title { get; set; }
        public string Content { get; set; }
        public string? Thumbnail { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow; 
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public bool IsPublished { get; private set; } = false;
        public int ViewCount { get; set; }
        public string AuthorName { get; set; } //đọc tên Author
    }
}
