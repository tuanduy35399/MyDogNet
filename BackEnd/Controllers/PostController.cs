using BackEnd.Data;
using BackEnd.DTOs.PostDTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Runtime.InteropServices;

namespace BackEnd.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class PostController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public PostController(ApplicationDbContext context) => _context = context;
        [HttpGet(Name = "getPostPublish")]
        
        [ResponseCache(Location = ResponseCacheLocation.Client, Duration =100)]
        public async Task<IActionResult> GetAllPost()
        {
            
            var allPost = await _context.Posts
                .Where(post => post.IsPublished == true)
                .Select(post => new ReadPostDTO
                {
                    Id= post.Id,
                    Title = post.Title,
                    Content = post.Content,
                    Thumbnail = post.Thumbnail,
                    AuthorName = post.Author.UserName,
                    CreatedAt = post.CreatedAt,
                    UpdatedAt = post.UpdatedAt,
                    ViewCount = post.ViewCount,

                })
                .ToListAsync();
            return Ok(allPost);
        }
        [HttpGet("{id}", Name = "getDetailPost")]
        [ResponseCache(Location = ResponseCacheLocation.Client, Duration = 100)]
        public async Task<IActionResult> GetDetail(int id)
        {
            //Author có thể null
            var post = await _context.Posts.Include(p => p.Author).FirstOrDefaultAsync(p=> p.Id == id);
            if (post == null) return NotFound();
            var postDTO = new ReadPostDTO
            {
                Title = post.Title,
                Content = post.Content,
                Thumbnail = post.Thumbnail,
                AuthorName = post.Author.UserName,
                CreatedAt = post.CreatedAt,
                UpdatedAt = post.UpdatedAt,
                ViewCount = post.ViewCount,
            };
            return Ok(postDTO);
        }
        //[HttpPost]
        //public async Task<IActionResult> CreatePost(CreatePostDTO createPostDTO)
        //{
        //   if()
        //}
    }
}
