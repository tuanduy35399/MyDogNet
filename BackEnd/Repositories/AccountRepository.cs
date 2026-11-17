using BackEnd.DTOs.AdminDTOs;
using BackEnd.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using Newtonsoft.Json.Linq;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using BackEnd.Data;
using Microsoft.EntityFrameworkCore;


namespace BackEnd.Repositories
{
    public class AccountRepository : IAccountRepository
    {
        private readonly UserManager<Admin> _userManager;
        private readonly SignInManager<Admin> _signInManager;
        private readonly IConfiguration _configuration;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AccountRepository> _logger;
        public AccountRepository(UserManager<Admin> userManager, SignInManager<Admin> signInManager, IConfiguration configuration, ApplicationDbContext context, ILogger<AccountRepository> logger)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _configuration = configuration; //lấy từ appconfig.jspon
            _context = context;
            _logger = logger;
        }
        //Dùng Task<IEnumerable<AllAccounts>> để chỉ đọc, chặn việc sửa đổi như List<>
        public async Task<IEnumerable<AllAccounts>> GetAllAccountsAsync()
        {
            var listAccount = await _context.Admins.Select(
                acc => new AllAccounts
                {
                    Id = acc.Id,
                    UserName= acc.UserName,

                }).ToArrayAsync();
            return listAccount;
        }
        public async Task<ReadAdminDTO?> GetMoreDetail(string id)
        {
            return await _context.Admins
                .Where(admin => admin.Id == id)
                .Select(admin => new ReadAdminDTO
                {
                    UserName = admin.UserName,
                    Avatar = admin.Avatar,
                    Describe = admin.Describe,
                    BackGroundImg = admin.BackGroundImg
                })
                .FirstOrDefaultAsync();
        }
        public async Task<IdentityResult> SignUpAsync(SignUpDTO modelDTO)
        {
            var user = new Admin
            {
                UserName = modelDTO.UserName,

            };
            var result = await _userManager.CreateAsync(user, modelDTO.Password);
            if (result.Succeeded) result = await _userManager.AddToRoleAsync(user, modelDTO.Role);
            return result;
        }

        public async Task<string> SignInAsync(SignInDTO modelDTO)
        {
            await using var tx = await _context.Database.BeginTransactionAsync();
            var normalized = _userManager.NormalizeName(modelDTO.UserName);
            // Serialize failures for the same account across instances; Identity keeps the lockout in SQL.
            var existing = await _context.Admins.FromSqlInterpolated($"SELECT * FROM AspNetUsers WITH (UPDLOCK, ROWLOCK) WHERE NormalizedUserName={normalized}").SingleOrDefaultAsync();
            if (existing != null && !existing.LockoutEnabled)
                await _userManager.SetLockoutEnabledAsync(existing, true);
            var result = await _signInManager.PasswordSignInAsync(modelDTO.UserName, modelDTO.Password, false, true);
            await tx.CommitAsync();
            if (!result.Succeeded) { _logger.LogWarning("Login failed or account locked"); return string.Empty; }
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
            foreach (var role in await _userManager.GetRolesAsync(user))
                authClaims.Add(new Claim(ClaimTypes.Role, role));
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
