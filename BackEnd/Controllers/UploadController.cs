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
        public UploadController(CloudinaryService cloudinaryService)
        {
            _cloudinarySerivce = cloudinaryService;
        }
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("File is empty");
            var url = await _cloudinarySerivce.UploadImageAsync(file);
            return Ok(new { url });
        }
    }

}

