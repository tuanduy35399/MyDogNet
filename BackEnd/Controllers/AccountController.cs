using BackEnd.Maintenance;
using BackEnd.Data;
using System.Security.Claims;
using BackEnd.DTOs.AdminDTOs;
using BackEnd.Models;
using BackEnd.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly IAccountRepository _repo;
        private readonly UserManager<Admin> _userManager;
        public AccountController(IAccountRepository repo, UserManager<Admin> userManager)
        {
            _repo = repo;
            _userManager = userManager;
        }
        //Lấy danh sách các tài khoản
        [HttpGet]
        [Authorize(Roles = "Admin")]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        public async Task<IActionResult> GetAllAccount()
        {
            var result = await _repo.GetAllAccountsAsync();
            if (result == null) return NotFound();
            return Ok(result);
        }
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Editor")]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        public async Task<IActionResult> GetDetailAccount(string id)
        {
            if (!User.IsInRole("Admin") && User.FindFirstValue(ClaimTypes.NameIdentifier) != id) return Forbid();
            var result = await _repo.GetMoreDetail(id);
            if (result == null) return NotFound();
            return Ok(result);
        }
        //Tạm thời bỏ luôn vụ tạo thêm 1 tài khoản admin khác
        //[HttpPost]
        //public async Task<IActionResult> CreateNewAccount { get; set; }

        [HttpPost("signUp")]
        [Authorize(Roles = "Admin")]
        //[AllowAnonymous]
        public async Task<IActionResult> SignUp(SignUpDTO signUpModel)
        {
            if (signUpModel.Role is not ("Admin" or "Editor")) return BadRequest("Vai trò không hợp lệ.");
            var result = await _repo.SignUpAsync(signUpModel);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                return BadRequest(new
                {
                    message = "Sign up failed",
                    errors
                });
            }
            return Ok(result.Succeeded);
        }
        [HttpPost("signIn")]
        //[AllowAnonymous]
        public async Task<IActionResult> SignIn(SignInDTO signInModel)
        {
            var result = await _repo.SignInAsync(signInModel);
            if (string.IsNullOrEmpty(result))
            {
                return Unauthorized(new
                {
                    message = "Sign in failed",
                    error = "Invalid username or password"
                });
            }
            return Ok(result);
        }
        //Cái này để tạm , sau này có thời gian thì fix thêm
        //Do chưa chuẩn SOLID, logic của cái này cần tách thành file Repository
        [HttpPatch("{id}")]
        [Authorize(Roles = "Admin,Editor")]
        public async Task<IActionResult> Update(string id, [FromBody] JsonPatchDocument<UpdateAdminDTO> patchDocument, [FromServices] ApplicationDbContext db, [FromServices] MediaLifecycle media)
        {
            if (!User.IsInRole("Admin") && User.FindFirstValue(ClaimTypes.NameIdentifier) != id) return Forbid();
            if (patchDocument?.Operations.Any(o => o.op != "replace" || string.IsNullOrEmpty(o.path) || !new[] { "/username", "/describe", "/avatar", "/backgroundimg" }.Contains(o.path.ToLowerInvariant())) == true) return BadRequest("Trường cập nhật không hợp lệ.");
            if (patchDocument == null)
            {
                return BadRequest();
            }
            var oldAdmin = await _userManager.FindByIdAsync(id);
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
            var avatarError = ContentRules.Validate("profile", "<p>profile</p>", adminToPatch.Avatar)
                ?? ContentRules.Validate("profile", "<p>profile</p>", adminToPatch.BackGroundImg);
            if (avatarError != null) return BadRequest(avatarError);
            await using var tx = await db.Database.BeginTransactionAsync();
            //Kiem tra nguoi dung co doi username khong
            if (oldAdmin.UserName != adminToPatch.UserName)
            {
                var setUserNameResult = await _userManager.SetUserNameAsync(oldAdmin, adminToPatch.UserName);
                if (!setUserNameResult.Succeeded)
                {
                    return BadRequest(setUserNameResult.Errors);
                }
            }
            try { await media.SyncReferences(User, ContentRules.ImageUrls(null, adminToPatch.Avatar, adminToPatch.BackGroundImg), adminId: id); }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException e) { return BadRequest(e.Message); }
            oldAdmin.Avatar = adminToPatch.Avatar;
            oldAdmin.Describe = adminToPatch.Describe;
            oldAdmin.BackGroundImg = adminToPatch.BackGroundImg;
            //await _context.SaveChangesAsync();
            var updateResult = await _userManager.UpdateAsync(oldAdmin);
            if (!updateResult.Succeeded) return BadRequest(updateResult.Errors);
            await tx.CommitAsync();
            return Ok(new
            {
                message = "Update profile success",
            });
        }
    }
}
