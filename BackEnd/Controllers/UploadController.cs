//using BackEnd.Services;
//using Microsoft.AspNetCore.Http;
//using Microsoft.AspNetCore.Mvc;

//namespace BackEnd.Controllers
//{
//    [Route("[controller]")]
//    [ApiController]
//    public class UploadController : ControllerBase
//    {
//        private readonly CloudinaryService _cloudinarySerivce;
//            public UploadController(CloudinaryService cloudinaryService)
//            {
//                _cloudinarySerivce = cloudinaryService;
//            }
//            [HttpPost("upload")]
//            public async Task<IActionResult> Upload(IFormFile file)
//            {
//            var url = await _cloudinarySerivce.UploadImageAsync(file);
//            return Ok(new { url });
//            }
//        }

//    }
//}
