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
        [ResponseCache(Location = ResponseCacheLocation.Any, Duration = 60)]
        public async Task<IActionResult> GetAllAccount()
        {
            var result = await _repo.GetAllAccountsAsync();
            if (result == null) return NotFound();
            return Ok(result);
        }
        [HttpGet("{id}")]
        [ResponseCache(Location = ResponseCacheLocation.Any, Duration = 60)]
        public async Task<IActionResult> GetDetailAccount(string id)
        {
            var result = await _repo.GetMoreDetail(id);
            if (result == null) return NotFound();
            return Ok(result);
        }
        //Tạm thời bỏ luôn vụ tạo thêm 1 tài khoản admin khác
        //[HttpPost]
        //public async Task<IActionResult> CreateNewAccount { get; set; }

        [HttpPost("signUp")]
        //[AllowAnonymous]
        public async Task<IActionResult> SignUp(SignUpDTO signUpModel)
        {
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
        [Authorize]
        public async Task<IActionResult> Update(string id, [FromBody] JsonPatchDocument<UpdateAdminDTO> patchDocument)
        {
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
            //Kiem tra nguoi dung co doi username khong
            if (oldAdmin.UserName != adminToPatch.UserName)
            {
                var setUserNameResult = await _userManager.SetUserNameAsync(oldAdmin, adminToPatch.UserName);
                if (!setUserNameResult.Succeeded)
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
