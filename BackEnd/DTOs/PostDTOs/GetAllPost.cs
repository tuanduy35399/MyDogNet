namespace BackEnd.DTOs.PostDTOs
{
    public class GetAllPost
    {
        public string Title { get; set; }
        public string? Thumbnail { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public int ViewCount { get; set; }
        public string AuthorName { get; set; } //đọc tên Author
    }
}
