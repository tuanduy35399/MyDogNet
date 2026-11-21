using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class UploadController : ControllerBase
    {
        private readonly ICloudinaryServices _cloudinarySerivce;
        public UploadController(ICloudinaryServices cloudinaryService)
        {
            _cloudinarySerivce = cloudinaryService;
        }
        [HttpPost]
[Authorize]
public async Task<IActionResult> Upload(IFormFile file)
{
    try 
    {
        if (file == null || file.Length == 0) return BadRequest("File is empty");
        var url = await _cloudinarySerivce.UploadImageAsync(file);
        return Ok(new { url });
    }
    catch (Exception ex)
    {
        // Khi lỗi, Server sẽ trả về nội dung lỗi thực sự thay vì số 500 vô hồn
         return StatusCode(500, new
        {
            error = ex.Message,
            detail = ex.StackTrace, // Cái này sẽ chỉ đích danh dòng số mấy bị lỗi
            inner = ex.InnerException?.Message
        });
            }
}
    }

}

