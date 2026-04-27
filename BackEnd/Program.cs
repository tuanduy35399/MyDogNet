using BackEnd.Data;
using BackEnd.Models;
using BackEnd.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<CloudinaryService>(); //<> generic khai báo muốn đk cái gì () dùng để thực thi AddScope ngay
builder.Services.AddDbContext<ApplicationDbContext>(opts =>
{
    opts.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
});
builder.Services.AddIdentity<Admin, IdentityRole<int>>()  //dùng class Admin làm User, Role kiểu int để quản lý
    .AddEntityFrameworkStores<ApplicationDbContext>() //cho biết data User và Role lưu bằng EF core trong DB
    .AddDefaultTokenProviders(); // bật các chức năng reset pass, email confirm, gen token
builder.Services.AddAuthentication(opts => //Cấu hình xác thực người dùng bằng JWT
{
    opts.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme; //Lấy thông tin user từ đâu -> lấy từ JWT
    opts.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;//khi bị từ chối thì xử lý ntn? -> trả về
    //lỗi 404 Unauthorized
    opts.DefaultScheme = JwtBearerDefaults.AuthenticationScheme; // dùng JWT cho toàn bộ hệ thống
}).AddJwtBearer(opts =>
{
    opts.SaveToken = true;
    opts.RequireHttpsMetadata = false;
    opts.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidAudience = builder.Configuration["JWT:ValidAudience"],
        ValidIssuer = builder.Configuration["JWT:ValidIssuer"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            builder.Configuration["JWT:SecretKey"]
            ))
    };
});
var app = builder.Build();


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
