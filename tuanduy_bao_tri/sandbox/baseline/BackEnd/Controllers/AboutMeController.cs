using BackEnd.Data;
using BackEnd.DTOs.AdminDTOs;
using BackEnd.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
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
        //Cái này nó sẽ trả về 1 list các thông tin chi tiết của các tài khoản admin
        //Bí quá nên thôi tạm để vậy, bên FE xử lý hiển thị cái tài khoản đầu tiên thôi
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
    }
}
