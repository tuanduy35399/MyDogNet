using BackEnd.DTOs.AdminDTOs;
using BackEnd.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.Repositories
{
    public class AccountRepository : IAccountRepository
    {
        public AccountRepository(UserManager<Admin> userManager, SignInManager<Admin> signInManager, IConfiguration configuration)
        {
            
        }
        public Task<IActionResult> SignUpAsync(SignUpDTO modelDTO)
        {
            throw new NotImplementedException();
        }

        Task<string> IAccountRepository.SignInAsync(SignInDTO modelDTO)
        {
            throw new NotImplementedException();
        }
    }
}
