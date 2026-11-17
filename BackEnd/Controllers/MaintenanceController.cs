using BackEnd.Maintenance;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace BackEnd.Controllers;
[ApiController, Route("Maintenance"), Authorize(Roles = "Admin")]
public class MaintenanceController : ControllerBase
{
    [HttpPost("media-cleanup")]
    public async Task<IActionResult> Cleanup([FromServices] MediaLifecycle media, [FromServices] ICloudinaryServices cloud,
        [FromServices] IConfiguration config, bool dryRun = true)
    {
        if (!dryRun && !config.GetValue<bool>("MediaCleanup:AllowDelete")) return BadRequest("Chưa bật quyền dọn thật. Xem dry-run và cấu hình AllowDelete trước.");
        return Ok(await media.Cleanup(dryRun, cloud, HttpContext.RequestAborted));
    }
}
