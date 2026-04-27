using BackEnd.Data;
using BackEnd.DTOs.AdminDTOs;
using BackEnd.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class AboutMeController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        //Dependency Injection
        public AboutMeController(ApplicationDbContext context)
        {
            _context = context;
        }

        //Tạo các endpoint
        [HttpGet]
        [ResponseCache(Location = ResponseCacheLocation.Client, Duration = 60)]
        public async Task<IActionResult> GetDetailAboutMe()
        {
            var detail = await _context.Admins.Select(
                admin => new ReadAdminDTO
                {
                    UserName = admin.UserName,
                    Avatar = admin.Avatar,
                    Describe = admin.Describe,
                    BackGroundImg = admin.BackGroundImg,
                }).ToArrayAsync();

            return Ok(detail);
        }
        //[HttpPost]
        //public async Task { get; set; }
        //Để cập nhật thì cần đăng nhập
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(int id, Admin newAdmin)
        {
            if(newAdmin==null)
            {
                return BadRequest();
            }
            var oldAdmin = await _context.Admins.FirstOrDefaultAsync(admin => admin.Id == id);
            if (oldAdmin == null) return NotFound();
            oldAdmin.UserName = newAdmin.UserName;
            oldAdmin.Avatar = newAdmin.Avatar;
            oldAdmin.Describe = newAdmin.Describe;
            oldAdmin.BackGroundImg = newAdmin.BackGroundImg;
            _context.SaveChangesAsync();
            return NoContent();
        }

    }
}
