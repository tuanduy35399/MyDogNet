

using BackEnd.Data;
using BackEnd.DTOs;
using BackEnd.DTOs.PostDTOs;
using BackEnd.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Runtime.InteropServices;
using System.Security.Claims;

namespace BackEnd.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class PostController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        //private readonly IMapper _mapper;
        public PostController(ApplicationDbContext context) {
            _context = context;
            //_mapper = mapper;
            }
        //[HttpGet(Name = "getPostPublish")]
        
        //[ResponseCache(Location = ResponseCacheLocation.Client, Duration =100)]
        //public async Task<IActionResult> GetPosts(int pageNumber = 1, int pageSize = 5)
        //{
        //    if (pageNumber < 1) pageNumber = 1;
        //    var totalRecords = await _context.Posts.CountAsync();
        //    var posts = await _context.Posts
        //.OrderByDescending(p => p.CreatedAt) // Hiện bài mới nhất trước
        //.Skip((pageNumber - 1) * pageSize)   // Công thức tính số bản ghi cần bỏ qua
        //.Take(pageSize)                      // Lấy đúng số lượng pageSize
        //.Select(post=> new GetAllPost
        //{
        //    Id = post.Id,
        //    Title = post.Title,
        //    Thumbnail = post.Thumbnail,
        //    AuthorName = post.Author.UserName,
        //    CreatedAt = post.CreatedAt,
        //    UpdatedAt = post.UpdatedAt,
        //    ViewCount = post.ViewCount,

        //})
        //.ToListAsync();
        //    var response = new PagedResponse<GetAllPost>
        //    {
        //        Data = posts,
        //        TotalRecords = totalRecords,
        //        PageNumber = pageNumber,
        //        PageSize = pageSize
        //    };
        //    return Ok(response);
        //}

        [HttpGet(Name ="SearchPost")]
        [ResponseCache(Location = ResponseCacheLocation.Client, Duration = 100)]
        public async Task<IActionResult> GetPosts(int pageNumber = 1, int pageSize = 5, string? searchTerm = null)
        {
            // Tạo truy vấn cơ bản
            var query = _context.Posts.AsQueryable();

            // Nếu có từ khóa tìm kiếm, lọc theo tiêu đề
            if (!string.IsNullOrEmpty(searchTerm))
            {
                query = query.Where(p => p.Title.Contains(searchTerm));
            }

            var totalRecords = await query.CountAsync();
            var posts = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(post => new GetAllPost
                {
                    Id = post.Id,
                    Title = post.Title,
                    Thumbnail = post.Thumbnail,
                    AuthorName = post.Author.UserName,
                    CreatedAt = post.CreatedAt,
                    UpdatedAt = post.UpdatedAt,
                    ViewCount = post.ViewCount,
                })
                .ToListAsync();

            return Ok(new PagedResponse<GetAllPost>
            {
                Data = posts,
                TotalRecords = totalRecords,
                PageNumber = pageNumber,
                PageSize = pageSize
            });
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
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreatePost(CreatePostDTO createPostDTO)
        {
            if (createPostDTO==null) return BadRequest("Invalid data");
            //Lấy userId hiện đang login từ JWT
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var post = new Post
            {
                Title = createPostDTO.Title,
                Content = createPostDTO.Content,
                AuthorId = userId,
                IsPublished = createPostDTO.IsPublished,
                Thumbnail = createPostDTO.Thumbnail,
                
            };
            _context.Posts.Add(post);
            await _context.SaveChangesAsync();
            return Ok(new
            {
                message = "Create success",
                post.AuthorId,
            });
        }
        [HttpPatch("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdatePost(int id, [FromBody] JsonPatchDocument<UpdatePostDTO> PostDocument)
        {
            if (PostDocument == null) return BadRequest();
            var oldPost = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id);
            if (oldPost == null) return NotFound();

            //Đổ tất cả sang 1 class lọc DTO đầy đủ các trường

            //var postToPatch = _mapper.Map<UpdatePostDTO>(oldPost); //Tạo đối tượng mới kiểu UpdatePostDTO nguồn là oldPost
            var postToPatch = new UpdatePostDTO
            {
                Title = oldPost.Title,
                Content = oldPost.Content,
                Thumbnail = oldPost.Thumbnail,
            };
            //kiểm tra, so sánh thay đổi, xóa với trường nào, trường nào giữ nguyên
            //Rồi tiến hành thay đổi DTO đó
            PostDocument.ApplyTo(postToPatch, ModelState);
            if (!ModelState.IsValid) return BadRequest(ModelState);
            //Ánh xạ ngược lại từ DTO sang Entity
            //Khác với put thì khi người dùng gửi thiếu 1 trường, bên put sẽ cho nó là null luôn chứ không có bước so sánh
            //_mapper.Map(postToPatch, oldPost); //ghi đè đối tượng oldPost đã có từ nguồn postToPatch
            oldPost.Title = postToPatch.Title;
            oldPost.Content = postToPatch.Content;
            oldPost.Thumbnail = postToPatch.Thumbnail;
            await _context.SaveChangesAsync();
            return Ok(new
            {
                message="Update post success",
                oldPost.Id
            })
            ;
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePost(int id)
        {
            var post = await _context.Posts
                .Where(post => post.Id == id)
                .FirstOrDefaultAsync();
            if (post == null)
            {
                return NotFound(new { message = $"Không tìm thấy bài đăng với ID = {id}" });
            }
            _context.Remove(post);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
