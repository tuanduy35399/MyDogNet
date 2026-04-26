using BackEnd.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AboutMeController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        //Dependency Injection
        public AboutMeController(ApplicationDbContext context)
        {
            _context = context;
        }

        ////Tạo các endpoint
        //[HttpGet]
        //[ResponseCache(Location = ResponseCacheLocation.Client, Duration = 60)]
        //public async 
    }
}
