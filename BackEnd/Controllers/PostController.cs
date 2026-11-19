using BackEnd.Data;
using BackEnd.DTOs;
using BackEnd.DTOs.PostDTOs;
using BackEnd.Models;
using BackEnd.Maintenance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BackEnd.Controllers;

[ApiController, Route("[controller]")]
public class PostController : ControllerBase
{
    private readonly ApplicationDbContext db;
    private readonly MediaLifecycle media;

    public PostController(ApplicationDbContext db) : this(db, null!) { }

    public PostController(ApplicationDbContext db, MediaLifecycle media) => (this.db, this.media) = (db, media);

    private bool CanEdit(Post post) => User.IsInRole("Admin") || post.AuthorId == User.FindFirstValue(ClaimTypes.NameIdentifier);

    [HttpGet]
    public Task<IActionResult> List(int pageNumber = 1, int pageSize = 5, string? searchTerm = null) => ListPosts(false, pageNumber, pageSize, searchTerm);

    [NonAction]
    public Task<IActionResult> GetPosts(int pageNumber = 1, int pageSize = 5, string? searchTerm = null) => List(pageNumber, pageSize, searchTerm);

    [HttpGet("manage"), Authorize(Roles = "Admin,Editor"), ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public Task<IActionResult> Manage(int pageNumber = 1, int pageSize = 5, string? searchTerm = null) => ListPosts(true, pageNumber, pageSize, searchTerm);

    private async Task<IActionResult> ListPosts(bool manage, int page, int size, string? search)
    {
        if (page < 1 || size < 1 || size > 50)
        {
            return BadRequest(new { message = "Tham số phân trang không hợp lệ: pageNumber phải >= 1 và pageSize phải từ 1 đến 50." });
        }

        var query = db.Posts.AsNoTracking().AsQueryable();
        if (!manage)
        {
            query = query.Where(x => x.IsPublished);
        }
        else if (User?.Identity?.IsAuthenticated == true && !User.IsInRole("Admin"))
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
            query = query.Where(x => x.AuthorId == id);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(x => x.Title.Contains(term));
        }

        var total = await query.CountAsync();
        var rows = await query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).Skip((page - 1) * size).Take(size)
            .Select(x => new GetAllPost
            {
                Id = x.Id,
                Title = x.Title,
                Thumbnail = x.Thumbnail,
                AuthorName = x.Author!.UserName,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt,
                ViewCount = x.ViewCount
            }).ToListAsync();

        return Ok(new PagedResponse<GetAllPost> { Data = rows, TotalRecords = total, PageNumber = page, PageSize = size });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Detail(int id) => await Read(id, false);

    [HttpGet("manage/{id:int}"), Authorize(Roles = "Admin,Editor"), ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> ManageDetail(int id) => await Read(id, true);

    private async Task<IActionResult> Read(int id, bool manage)
    {
        var post = await db.Posts.AsNoTracking().Include(x => x.Author).SingleOrDefaultAsync(x => x.Id == id);
        if (post == null || (!manage && !post.IsPublished)) return NotFound();
        if (manage && !CanEdit(post)) return Forbid();
        return Ok(new
        {
            post.Id,
            post.Title,
            post.Content,
            post.Thumbnail,
            post.IsPublished,
            post.CreatedAt,
            post.UpdatedAt,
            post.ViewCount,
            AuthorName = post.Author?.UserName
        });
    }

    [HttpPost, Authorize(Roles = "Admin,Editor"), RequestSizeLimit(1024 * 1024)]
    public async Task<IActionResult> Create(CreatePostDTO data)
    {
        var error = ContentRules.Validate(data.Title, data.Content, data.Thumbnail);
        if (error != null) return BadRequest(error);
        await using var tx = await db.Database.BeginTransactionAsync();
        var post = new Post
        {
            Title = data.Title,
            Content = data.Content,
            Thumbnail = data.Thumbnail,
            IsPublished = data.IsPublished,
            AuthorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!
        };
        db.Posts.Add(post);
        await db.SaveChangesAsync();
        try
        {
            await media.SyncReferences(User, ContentRules.ImageUrls(post.Content, post.Thumbnail), postId: post.Id);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException e) { return BadRequest(e.Message); }
        await tx.CommitAsync();
        return Ok(new { post.Id, message = "Create success", post.AuthorId });
    }

    [HttpPatch("{id:int}"), Authorize(Roles = "Admin,Editor"), RequestSizeLimit(1024 * 1024)]
    public async Task<IActionResult> Update(int id, JsonPatchDocument<UpdatePostDTO> patch)
    {
        if (patch == null || patch.Operations.Any(o => o.op != "replace" || string.IsNullOrEmpty(o.path) || !new[] { "/title", "/content", "/thumbnail" }.Contains(o.path.ToLowerInvariant()))) return BadRequest();
        await using var tx = await db.Database.BeginTransactionAsync();
        // Lock the post so two edits cannot leave references for an outdated Content version.
        var post = await db.Posts.FromSqlInterpolated($"SELECT * FROM Posts WITH (UPDLOCK, ROWLOCK) WHERE Id={id}").SingleOrDefaultAsync();
        if (post == null) return NotFound();
        if (!CanEdit(post)) return Forbid();
        var data = new UpdatePostDTO { Title = post.Title, Content = post.Content, Thumbnail = post.Thumbnail };
        patch.ApplyTo(data, ModelState);
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var error = ContentRules.Validate(data.Title, data.Content, data.Thumbnail);
        if (error != null) return BadRequest(error);
        try
        {
            await media.SyncReferences(User, ContentRules.ImageUrls(data.Content, data.Thumbnail), postId: id);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException e) { return BadRequest(e.Message); }
        post.Title = data.Title;
        post.Content = data.Content;
        post.Thumbnail = data.Thumbnail;
        post.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return Ok(new { post.Id, message = "Update success" });
    }

    [HttpDelete("{id:int}"), Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> Delete(int id)
    {
        var post = await db.Posts.SingleOrDefaultAsync(x => x.Id == id);
        if (post == null) return NotFound();
        if (!CanEdit(post)) return Forbid();
        db.Posts.Remove(post);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
