using BackEnd.Security;
using BackEnd.Maintenance;
using Microsoft.AspNetCore.HttpOverrides;
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

// File riêng cho máy phát triển; biến môi trường và tham số CLI vẫn ưu tiên hơn.
if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: false)
        .AddEnvironmentVariables()
        .AddCommandLine(args);
}

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var jwtSecret = builder.Configuration["JWT:SecretKey"];
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("Thiếu ConnectionStrings:DefaultConnection. Chạy bash scripts/dev.sh init tại thư mục MyDogNet rồi điền BackEnd/appsettings.Local.json.");
if (string.IsNullOrWhiteSpace(jwtSecret) || Encoding.UTF8.GetByteCount(jwtSecret) < 32)
    throw new InvalidOperationException("JWT:SecretKey phải có ít nhất 32 byte. Điền trong appsettings.Local.json hoặc biến JWT__SecretKey.");

// Add services to the container.

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

builder.Services.AddScoped<IAccountRepository, AccountRepository>();
builder.Services.AddDbContext<ApplicationDbContext>(opts => //dang ky cho ApplicationDbContext
{
    opts.UseSqlServer(connectionString);
});
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 1024 * 1024);
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o => o.MultipartBodyLengthLimit = 5 * 1024 * 1024);
builder.Services.AddSingleton<LoginThrottle>();
builder.Services.AddScoped<MediaLifecycle>();
builder.Services.AddScoped<LegacyImageMigration>();
builder.Services.AddHostedService<MediaCleanupWorker>();
builder.Services.AddIdentity<Admin, IdentityRole>(options => {
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.AllowedForNewUsers = true;
})  //dùng class Admin làm User, Role kiểu int để quản lý
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
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ClockSkew = TimeSpan.Zero,
        ValidateAudience = true,
        ValidAudience = builder.Configuration["JWT:ValidAudience"],
        ValidIssuer = builder.Configuration["JWT:ValidIssuer"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            jwtSecret
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
builder.Services.AddScoped<ICloudinaryServices, CloudinaryService>();
var app = builder.Build();


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHttpsRedirection();
}
// Forwarded IPs are accepted only from explicitly configured proxies.
var proxies = builder.Configuration.GetSection("Security:KnownProxies").Get<string[]>() ?? Array.Empty<string>();
if (proxies.Length > 0)
{
    var forwarding = new ForwardedHeadersOptions { ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto, ForwardLimit = 1 };
    forwarding.KnownNetworks.Clear(); forwarding.KnownProxies.Clear();
    foreach (var proxy in proxies) forwarding.KnownProxies.Add(System.Net.IPAddress.Parse(proxy));
    app.UseForwardedHeaders(forwarding);
}
app.UseCors("AllowedHost");
app.Use(async (context, next) =>
{
    if (!context.Request.Path.Equals("/Upload", StringComparison.OrdinalIgnoreCase) && context.Request.ContentLength > 1024 * 1024)
    { context.Response.StatusCode = 413; await context.Response.WriteAsJsonAsync(new { message = "JSON vượt 1 MiB." }); return; }
    await next();
});
app.UseMiddleware<LoginThrottleMiddleware>();
//Cors phải nằm ở trên tất cả


app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Offline operator command; never exposed as an HTTP bootstrap endpoint.
var accountToGrant = builder.Configuration["grant-admin"] ?? builder.Configuration["grant-editor"];
if (accountToGrant is string adminName)
{
    using var scope = app.Services.CreateScope();
    var users = scope.ServiceProvider.GetRequiredService<UserManager<Admin>>();
    var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    foreach (var role in new[] { "Admin", "Editor" })
        if (!await roles.RoleExistsAsync(role)) await roles.CreateAsync(new IdentityRole(role));
    var owner = await users.FindByNameAsync(adminName) ?? throw new InvalidOperationException("Không tìm thấy tài khoản được chỉ định.");
    var requestedRole = builder.Configuration["grant-admin"] != null ? "Admin" : "Editor";
    var result = await users.IsInRoleAsync(owner, requestedRole) ? IdentityResult.Success : await users.AddToRoleAsync(owner, requestedRole);
    if (!result.Succeeded) throw new InvalidOperationException("Không cấp được vai trò Admin.");
    Console.WriteLine("Đã cấp vai trò cho tài khoản được chỉ định. Đăng nhập lại để lấy token mới.");
    return;
}
if (builder.Configuration["convert-base64"] is string mode)
{
    if (mode != "dry-run" && mode != "apply") throw new InvalidOperationException("Dùng dry-run hoặc apply.");
    using var scope = app.Services.CreateScope();
    if (mode == "apply")
    {
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Directory.CreateDirectory(".local");
        var backup = await db.Posts.AsNoTracking().Where(p => p.Content.Contains("data:")).ToListAsync();
        await File.WriteAllTextAsync(Path.Combine(".local", "legacy-backup-" + DateTime.UtcNow.ToString("yyyyMMddHHmmss") + ".json"), System.Text.Json.JsonSerializer.Serialize(backup));
    }
    Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(await scope.ServiceProvider.GetRequiredService<LegacyImageMigration>().Run(mode == "dry-run")));
    return;
}
app.Run();
public partial class Program { }
