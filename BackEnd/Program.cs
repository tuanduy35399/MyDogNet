using BackEnd.Data;
using BackEnd.Models;
using BackEnd.Repositories;
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
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Nhập: Bearer {your token}"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});
builder.Services.AddScoped<CloudinaryService>(); //<> generic khai báo muốn đk cái gì () dùng để thực thi AddScope ngay
builder.Services.AddScoped<IAccountRepository, AccountRepository>();
builder.Services.AddDbContext<ApplicationDbContext>(opts => //dang ky cho ApplicationDbContext
{
    opts.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
});
builder.Services.AddIdentity<Admin, IdentityRole>()  //dùng class Admin làm User, Role kiểu int để quản lý
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
//var originList = builder.Configuration["Cors:AllowedOrigins"].Get<string[]>(); 
//dùng GetSection là vì AllowedOrigins là array
//Còn ValidAudience và ValidIssuer là string nên gọi Configuration["key"] trả về giá trị đơn được
var originList = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
//.Get<T>(); đọc dữ liệu từ config map sang kiểu T
builder.Services.AddCors(opts=> 
opts.AddPolicy("AllowedHost", policy=>
{
    policy.WithOrigins(originList)
    .AllowAnyHeader()
    .AllowAnyMethod();
})
);

builder.Services.AddControllers().AddNewtonsoftJson(); //them dong nay de su dung NewtonsoftJson
var app = builder.Build();


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.UseCors("AlowedHost");
app.Run();
