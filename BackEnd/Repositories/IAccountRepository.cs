using BackEnd.DTOs.AdminDTOs;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.Repositories
{
    public interface IAccountRepository
    {
        Task<IEnumerable<AllAccounts>> GetAllAccountsAsync();
        Task<IdentityResult> SignUpAsync(SignUpDTO modelDTO);
         Task<string> SignInAsync(SignInDTO modelDTO); //dùng string trả về chuỗi token
    }
}
