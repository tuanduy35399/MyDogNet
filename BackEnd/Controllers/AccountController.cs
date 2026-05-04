using BackEnd.DTOs.AdminDTOs;
using BackEnd.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly IAccountRepository _repo;

        public AccountController(IAccountRepository repo)
        {
            _repo = repo;
        }
        [HttpGet]
        [ResponseCache(Location = ResponseCacheLocation.Any, Duration = 60)]
        public async Task<IActionResult> GetAllAccount()
        {
            var result = await _repo.GetAllAccountsAsync();
            if (result == null) return NotFound();
            return Ok(result);
        }
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
    }
}
