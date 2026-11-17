using BackEnd.Data;
using BackEnd.Models;
using BackEnd.Services;
using BackEnd.Maintenance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
namespace BackEnd.Controllers;
[ApiController, Route("[controller]"), Authorize(Roles = "Admin,Editor")]
public class UploadController : ControllerBase
{
    [HttpPost, RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file, [FromServices] ICloudinaryServices cloud, [FromServices] ApplicationDbContext db)
    {
        if (file.Length > ContentRules.MaxImageBytes) return StatusCode(413, new { message = "Ảnh vượt 5 MiB." });
        if (!await ContentRules.IsImage(file)) return BadRequest(new { message = "Chỉ chấp nhận JPEG, PNG hoặc WebP hợp lệ." });
        UploadedImage uploaded;
        try { uploaded = await cloud.UploadImageAsync(file); }
        catch { return StatusCode(502, new { message = "Không tải ảnh lên được. Vui lòng thử lại." }); }
        var asset = new MediaAsset { OwnerId = User.FindFirstValue(ClaimTypes.NameIdentifier), PublicId = uploaded.PublicId, Url = uploaded.Url };
        db.MediaAssets.Add(asset);
        try { await db.SaveChangesAsync(); }
        catch
        {
            try { await cloud.DeleteImageAsync(uploaded.PublicId); } catch { /* Keep the error generic; operator can reconcile an interrupted upload. */ }
            return StatusCode(503, new { message = "Chưa lưu được ảnh. Vui lòng thử lại." });
        }
        return Ok(new { url = asset.Url, assetId = asset.Id });
    }
}
