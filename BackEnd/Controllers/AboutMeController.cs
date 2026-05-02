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
        private readonly UserManager<Admin> _userManager;
        public AboutMeController(ApplicationDbContext context, UserManager<Admin> userManager)
        {
            _context = context;
            _userManager = userManager;
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
        [HttpPut]
        [Authorize]
        public async Task<IActionResult> Update([FromBody] JsonPatchDocument<UpdateAdminDTO> patchDocument)
        {
            if(patchDocument == null)
            {
                return BadRequest();
            }
            var oldAdmin = await _userManager.GetUserAsync(User);
            if (oldAdmin == null) return NotFound();
            var adminToPatch = new UpdateAdminDTO
            {
                UserName = oldAdmin.UserName,
                Describe = oldAdmin.Describe,
                Avatar = oldAdmin.Avatar,
                BackGroundImg = oldAdmin.BackGroundImg,
            };
            patchDocument.ApplyTo(adminToPatch, ModelState);
            if (!ModelState.IsValid) return BadRequest(ModelState);
            //Kiem tra nguoi dung co doi username khong
            if(oldAdmin.UserName!= adminToPatch.UserName)
            {
                var setUserNameResult = await _userManager.SetUserNameAsync(oldAdmin, adminToPatch.UserName);
                if(!setUserNameResult.Succeeded)
                {
                    return BadRequest(setUserNameResult.Errors);
                }
            }
            oldAdmin.Avatar = adminToPatch.Avatar;
            oldAdmin.Describe = adminToPatch.Describe;
            oldAdmin.BackGroundImg = adminToPatch.BackGroundImg;
            //await _context.SaveChangesAsync();
            var updateResult = await _userManager.UpdateAsync(oldAdmin);
            if (!updateResult.Succeeded) return BadRequest(updateResult.Errors);
            return Ok(new
            {
                message = "Update profile success",
            });
        }

    }
}
