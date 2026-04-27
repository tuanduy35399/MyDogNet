using BackEnd.DTOs.AdminDTOs;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.Repositories
{
    public interface IAccountRepository
    {
        public Task<IdentityResult> SignUpAsync(SignUpDTO modelDTO);
        public Task<string> SignInAsync(SignInDTO modelDTO); //dùng string trả về chuỗi token
    }
}
