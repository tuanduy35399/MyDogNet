using BackEnd.DTOs.AdminDTOs;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.Repositories
{
    public interface IAccountRepository
    {
        public Task<IActionResult> SignUpAsync(SignUpDTO modelDTO);
        public Task<string> SignInAsync(SignInDTO modelDTO); //dùng string trả về chuỗi token
    }
}
