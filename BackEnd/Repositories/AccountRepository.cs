using BackEnd.DTOs.AdminDTOs;
using BackEnd.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using Newtonsoft.Json.Linq;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;


namespace BackEnd.Repositories
{
    public class AccountRepository : IAccountRepository
    {
        private readonly UserManager<Admin> _userManager;
        private readonly SignInManager<Admin> _signInManager;
        private readonly IConfiguration _configuration;

        public AccountRepository(UserManager<Admin> userManager, SignInManager<Admin> signInManager, IConfiguration configuration)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _configuration = configuration; //lấy từ appconfig.jspon
        }
        public async Task<IdentityResult> SignUpAsync(SignUpDTO modelDTO)
        {
            var user = new Admin
            {
                UserName = modelDTO.UserName,
                //Avatar = modelDTO.Avatar,
                //BackGroundImg = modelDTO.BackGroundImg,
                //PasswordHash = modelDTO.Password,
                
            };
            return await _userManager.CreateAsync(user, modelDTO.Password); 
        }

        public async Task<string> SignInAsync(SignInDTO modelDTO)
        {
            var result = await _signInManager.PasswordSignInAsync(modelDTO.UserName, modelDTO.Password,false, false);
            if (!result.Succeeded) return string.Empty;
            //Neu dung thi tao token
            //Claim dung de nhét thông tin user vào JWT token
            var user = await _userManager.FindByNameAsync(modelDTO.UserName);
            var authClaims = new List<Claim>
            {
                //tạo các cặp key-value thông tin user
                new Claim(ClaimTypes.Name, modelDTO.UserName),
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                //ID duy nhất cho mỗi JWT token
                //Jti là JWT ID
                //Guid chuỗi random duy nhất
                //thêm Jti để phân biệt token
                //User A login lần 1 → token 1 (jti = abc)
                //User A login lần 2 → token 2 (jti = xyz)
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };
            var authenKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JWT:SecretKey"]));
            var token= new JwtSecurityToken(
                issuer: _configuration["JWT:ValidIssuer"],
                audience: _configuration["JWT:ValidAudience"],
                expires: DateTime.Now.AddMinutes(20),
                claims:authClaims,
                signingCredentials: new SigningCredentials(authenKey, SecurityAlgorithms.HmacSha256Signature)
                );
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

    }
}
