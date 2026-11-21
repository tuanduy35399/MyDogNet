using BackEnd.Data;
using BackEnd.Models;
using BackEnd.Services;
using BackEnd.Maintenance;
using BackEnd.Security;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;

public class SandboxFactory : WebApplicationFactory<Program>
{
    public FakeCloud Cloud = new();
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseContentRoot(Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../BackEnd")));
        builder.ConfigureServices(s => { s.RemoveAll<ICloudinaryServices>(); s.AddSingleton<ICloudinaryServices>(Cloud); });
        // Only the captured pre-maintenance host needs this adapter: ca6d164
        // has ambiguous controller constructors. Its product source stays intact.
        if (Environment.GetEnvironmentVariable("MAINTENANCE_BASELINE_DI") == "true")
            builder.ConfigureServices(s => {
                s.AddControllers().AddControllersAsServices();
                s.AddTransient<BackEnd.Controllers.PostController>(p => new BackEnd.Controllers.PostController(
                    p.GetRequiredService<ApplicationDbContext>(), p.GetRequiredService<MediaLifecycle>()));
            });
    }
}
public static partial class Runner
{
    static SandboxFactory factory = null!;
    static readonly List<object> results = new();
    static readonly string password = "Sandbox9!_OnlyTesting";
    static readonly byte[] png = File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory,"fixtures/image.png"));
    static string output = Environment.GetEnvironmentVariable("MAINTENANCE_OUTPUT")!;
    static HttpClient Client(string? token = null) { var c = factory.CreateClient(); if(token!=null)c.DefaultRequestHeaders.Authorization=new("Bearer",token);return c; }
    static async Task<T> Db<T>(Func<ApplicationDbContext,Task<T>> action) { using var scope = factory.Services.CreateScope(); return await action(scope.ServiceProvider.GetRequiredService<ApplicationDbContext>()); }
    static void Assert(bool condition, string message) { if(!condition)throw new Exception(message); }
    static async Task Check(string id, string name, Func<Task<string>> test)
    {
        try { var detail=await test();results.Add(new {id,name,status="PASS",detail});Console.WriteLine($"PASS {id}: {detail}"); }
        catch(Exception e) { results.Add(new {id,name,status="FAIL",detail=e.Message});Console.WriteLine($"FAIL {id}: {e.Message}"); }
        await File.WriteAllTextAsync(Path.Combine(output,"results.json"),JsonSerializer.Serialize(results,new JsonSerializerOptions{WriteIndented=true}));
    }
    static async Task<string> Token(string user) => await (await Client().PostAsJsonAsync("/Account/signIn",new {userName=user,password})).Content.ReadAsStringAsync();
    static object PostData(string content="<p>Văn bản kiểm thử giữ nguyên.</p>",string? thumb=null) => new {title="Bài kiểm thử ảnh bảo trì",content,thumbnail=thumb,isPublished=true};
    static async Task<Guid> Asset(string owner,int hours=25,string state="Temp") => await Db(async db=> { var a=new MediaAsset{OwnerId=owner,PublicId="sandbox/"+Guid.NewGuid().ToString("N"),Url="/sandbox-assets/"+Guid.NewGuid()+".png",CreatedAt=DateTime.UtcNow.AddHours(-hours),State=state};db.Add(a);await db.SaveChangesAsync();return a.Id;});
    static async Task<HttpResponseMessage> Upload(HttpClient c,int size=0,bool valid=true)
    {
        var bytes = size>0 ? new byte[size] : png.ToArray();if(size>0)png.CopyTo(bytes,0);if(!valid)bytes=Encoding.UTF8.GetBytes("this is not a jpeg");
        var form = new MultipartFormDataContent(); var file=new ByteArrayContent(bytes);file.Headers.ContentType=new("image/png");form.Add(file,"file","test.png");return await c.PostAsync("/Upload",form);
    }
    public static async Task Main(string[] args)
    {
        factory=new SandboxFactory();Directory.CreateDirectory(output);
        using(var scope=factory.Services.CreateScope())
        {
            var db=scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            Assert(db.Database.GetConnectionString()!.Contains("MyDogNetMaintenanceAfter"),"Sandbox DB guard");
            await db.Database.MigrateAsync();
            var roles=scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            foreach(var role in new[]{"Admin","Editor"})if(!await roles.RoleExistsAsync(role))await roles.CreateAsync(new IdentityRole(role));
            var users=scope.ServiceProvider.GetRequiredService<UserManager<Admin>>();
            foreach(var name in new[]{"maintadmin","editorA","editorB","lockeduser","paralleluser"})
            {
                if(await users.FindByNameAsync(name)==null){var u=new Admin{UserName=name,Describe="Hồ sơ sandbox",Avatar="/dognet-logo.png",BackGroundImg="/background.png"};Assert((await users.CreateAsync(u,password)).Succeeded,"seed user");await users.AddToRoleAsync(u,name=="maintadmin"?"Admin":"Editor");}
            }
        }
        if(args.Contains("publication") || args.Contains("publication-baseline")) { await PublicationChecks(args.Contains("publication-baseline")); return; }
        if(args.Contains("serve-publication")) { await SeedPublicationFixtures(); await Serve(); return; }
        if(args.Contains("serve")) { await Serve();return; }
        var adminToken=await Token("maintadmin");var aToken=await Token("editorA");var bToken=await Token("editorB");
        using var admin=Client(adminToken);using var a=Client(aToken);using var b=Client(bToken);using var guest=Client();
        var aId=await Db(db=>db.Admins.Where(x=>x.UserName=="editorA").Select(x=>x.Id).SingleAsync());
        var bId=await Db(db=>db.Admins.Where(x=>x.UserName=="editorB").Select(x=>x.Id).SingleAsync());
        var created=await a.PostAsJsonAsync("/Post",PostData()); var postId=(await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        await Check("TC-HC01-01","Khách không quản trị",async()=>{Assert((int)(await guest.DeleteAsync($"/Post/{postId}")).StatusCode==401,"guest DELETE");Assert((int)(await guest.GetAsync("/Account")).StatusCode==401,"guest GET accounts");Assert(await Db(db=>db.Posts.AnyAsync(x=>x.Id==postId)),"post lost");return "DELETE/Account 401; bài còn nguyên";});
        await Check("TC-HC01-02","Token hết hạn",async()=>{var parsed=new JwtSecurityTokenHandler().ReadJwtToken(aToken);var cfg=factory.Services.GetRequiredService<IConfiguration>();var token=new JwtSecurityToken(cfg["JWT:ValidIssuer"],cfg["JWT:ValidAudience"],parsed.Claims,DateTime.UtcNow.AddHours(-2),DateTime.UtcNow.AddHours(-1),new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg["JWT:SecretKey"]!)),SecurityAlgorithms.HmacSha256));using var c=Client(new JwtSecurityTokenHandler().WriteToken(token));Assert((int)(await c.DeleteAsync($"/Post/{postId}")).StatusCode==401,"expired accepted");return "401 cho JWT hết hạn";});
        await Check("TC-HC01-03","Sai chủ sở hữu",async()=>{Assert((int)(await b.DeleteAsync($"/Post/{postId}")).StatusCode==403,"foreign delete");Assert((int)(await a.PatchAsJsonAsync($"/Account/{bId}",new[]{new{op="replace",path="/describe",value="hack"}})).StatusCode==403,"foreign profile");Assert((int)(await b.PatchAsJsonAsync($"/Post/{postId}",new[]{new{op="replace",path="/title",value="hack"}})).StatusCode==403,"foreign patch");return "Editor khác chủ nhận 403 ở bài và hồ sơ";});
        await Check("TC-HC01-04","Quyền đúng",async()=>{Assert((await a.PatchAsJsonAsync($"/Post/{postId}",new[]{new{op="replace",path="/title",value="Chủ bài sửa"}})).IsSuccessStatusCode,"own edit");Assert((await admin.PatchAsJsonAsync($"/Post/{postId}",new[]{new{op="replace",path="/title",value="Admin sửa"}})).IsSuccessStatusCode,"admin edit");return "Chủ bài và Admin sửa thành công";});
        await Check("TC-HC01-05","Cấp tài khoản",async()=>{var d=new{userName="createdEditor",password,confirmPassword=password};Assert((int)(await guest.PostAsJsonAsync("/Account/signUp",d)).StatusCode==401,"guest signup");Assert((int)(await a.PostAsJsonAsync("/Account/signUp",d)).StatusCode==403,"editor signup");Assert((await admin.PostAsJsonAsync("/Account/signUp",d)).IsSuccessStatusCode,"admin signup");return "Khách 401; Editor 403; Admin cấp Editor thành công";});
        await Check("TC-HC01-06","JWT bị sửa",async()=>{var parts=aToken.Split('.');var body=Encoding.UTF8.GetString(Base64UrlEncoder.DecodeBytes(parts[1])).Replace("Editor","Admin");using var c=Client(parts[0]+"."+Base64UrlEncoder.Encode(body)+"."+parts[2]);Assert((int)(await c.GetAsync("/Account")).StatusCode==401,"forged role");return "401 khi sửa role giữ chữ ký cũ";});
        await Check("API-HC02-BOUNDARY","Biên ảnh và tệp giả",async()=>{Assert((await Upload(a,5*1024*1024)).IsSuccessStatusCode,"5 MiB rejected");Assert((int)(await Upload(a,5*1024*1024+1)).StatusCode is 400 or 413,"oversize accepted");Assert((int)(await Upload(a,valid:false)).StatusCode==400,"fake image accepted");return "5 MiB nhận; +1 byte từ chối; tệp giả 400 (dịch vụ ảnh giả lập)";});
        await Check("TC-HC02-07","Chặn base64",async()=>{var content="<img src=\"data:image/png;base64,"+Convert.ToBase64String(png)+"\">";Assert((int)(await a.PostAsJsonAsync("/Post",PostData(content))).StatusCode==400,"POST base64");Assert((int)(await a.PatchAsJsonAsync($"/Post/{postId}",new[]{new{op="replace",path="/content",value=content}})).StatusCode==400,"PATCH base64");return "POST/PATCH 400; không lưu data URI";});
        string savedUrl="";
        await Check("API-HC02-STORE","Upload và lưu URL",async()=>{var uploaded=await (await Upload(a)).Content.ReadFromJsonAsync<JsonElement>();savedUrl=uploaded.GetProperty("url").GetString()!;Assert((await a.PostAsJsonAsync("/Post",PostData("<p>URL</p><img src=\""+savedUrl+"\">"))).IsSuccessStatusCode,"save URL");Assert(await Db(db=>db.MediaReferences.AnyAsync(x=>x.MediaAsset.Url==savedUrl)),"missing ref");Assert(!await Db(db=>db.Posts.AnyAsync(x=>x.Content.Contains("data:image"))),"base64 in DB");return "Content URL và MediaReference được lưu trong SQL thật";});
        await Check("TC-HC02-05","20/21 ảnh và JSON lớn",async()=>{var twenty=string.Concat(Enumerable.Repeat("<img src=\""+savedUrl+"\">",20));Assert((await a.PostAsJsonAsync("/Post",PostData(twenty))).IsSuccessStatusCode,"20 images rejected");Assert((int)(await a.PostAsJsonAsync("/Post",PostData(twenty+"<img src=\""+savedUrl+"\">"))).StatusCode==400,"21 images accepted");var big=new StringContent(JsonSerializer.Serialize(PostData(new string('x',1024*1024+10))),Encoding.UTF8,"application/json");Assert((int)(await a.PostAsync("/Post",big)).StatusCode==413,"JSON > 1MiB accepted");return "20 ảnh nhận, 21 ảnh 400, JSON >1 MiB 413";});
        await Check("API-HC02-OUTAGE","Lỗi upload",async()=>{factory.Cloud.FailUpload=true;try{Assert((int)(await Upload(a)).StatusCode==502,"cloud failure leaked");}finally{factory.Cloud.FailUpload=false;}return "Cloud timeout giả lập → 502 chung";});
        await Check("TC-HC02-08","Chuyển dữ liệu cũ",async()=>{await Db(async db=>{db.Posts.Add(new Post{Title="Bài cũ",Content="<p>Giữ định dạng <strong>đậm</strong></p><img src=\"data:image/png;base64,"+Convert.ToBase64String(png)+"\">",AuthorId=aId,IsPublished=true});await db.SaveChangesAsync();return 0;});using var scope=factory.Services.CreateScope();var migration=scope.ServiceProvider.GetRequiredService<LegacyImageMigration>();var dry=JsonSerializer.SerializeToElement(await migration.Run(true));Assert(dry.GetProperty("converted").GetInt32()==0,"dry writes");var run=JsonSerializer.SerializeToElement(await migration.Run(false));Assert(run.GetProperty("converted").GetInt32()==1,"migration failed");var count=factory.Cloud.Files.Count;await migration.Run(false);Assert(factory.Cloud.Files.Count==count,"duplicate upload");Assert(await Db(db=>db.Posts.AnyAsync(x=>x.Title=="Bài cũ"&&x.Content.Contains("<strong>đậm</strong>")&&!x.Content.Contains("data:"))),"format lost");return "Dry-run không ghi; chuyển 1 bài; chạy lại không upload trùng; giữ strong/text";});
        var old=await Asset(aId);var young=await Asset(aId,23);var used=await Asset(aId,state:"Used");
        await Check("TC-DP01-01","Dọn Temp 25 giờ",async()=>{using var s=factory.Services.CreateScope();var service=s.ServiceProvider.GetRequiredService<MediaLifecycle>();await service.Cleanup(true,factory.Cloud);Assert(await Db(db=>db.MediaAssets.Where(x=>x.Id==old).Select(x=>x.State).SingleAsync())=="Temp","dry deleted");await service.Cleanup(false,factory.Cloud);Assert(await Db(db=>db.MediaAssets.Where(x=>x.Id==old).Select(x=>x.State).SingleAsync())=="Deleted","not deleted");return "Dry-run giữ dữ liệu; chạy thật trên fake store đánh dấu Deleted";});
        await Check("TC-DP01-02-03","Giữ ảnh đang dùng và ảnh mới",async()=>{Assert(await Db(db=>db.MediaAssets.Where(x=>x.Id==young).Select(x=>x.State).SingleAsync())=="Temp","young deleted");Assert(await Db(db=>db.MediaAssets.Where(x=>x.Id==used).Select(x=>x.State).SingleAsync())=="Used","used deleted");Assert(await Db(db=>db.MediaAssets.Where(x=>x.Url==savedUrl).Select(x=>x.State).SingleAsync())=="Used","referenced deleted");return "Giữ Temp 23h, Used, ảnh có tham chiếu bài";});
        await Check("TC-DP01-05","Lỗi xóa và retry giới hạn",async()=>{var id=await Asset(aId);factory.Cloud.FailDelete=true;try{for(int i=0;i<4;i++){using var s=factory.Services.CreateScope();await s.ServiceProvider.GetRequiredService<MediaLifecycle>().Cleanup(false,factory.Cloud);}}finally{factory.Cloud.FailDelete=false;}var row=await Db(db=>db.MediaAssets.AsNoTracking().SingleAsync(x=>x.Id==id));Assert(row.State=="DeleteFailed"&&row.Attempts==3,"retry state");return "DeleteFailed, Attempts=3; không đánh dấu Deleted giả";});
        await Check("TC-DP01-04","Race lưu và dọn",async()=>{for(int i=0;i<10;i++){var id=await Asset(aId);var asset=await Db(db=>db.MediaAssets.AsNoTracking().SingleAsync(x=>x.Id==id));var save=a.PostAsJsonAsync("/Post",PostData("<img src=\""+asset.Url+"\">"));var cleanup=Task.Run(async()=>{using var s=factory.Services.CreateScope();await s.ServiceProvider.GetRequiredService<MediaLifecycle>().Cleanup(false,factory.Cloud);});var response=await save;await cleanup;var state=await Db(db=>db.MediaAssets.Where(x=>x.Id==id).Select(x=>x.State).SingleAsync());Assert(!response.IsSuccessStatusCode || state=="Used","saved reference deleted");Assert(state!="Deleted" || !await Db(db=>db.MediaReferences.AnyAsync(x=>x.MediaAssetId==id)),"deleted referenced image");}return "10 tranh chấp: không có tham chiếu tới ảnh Deleted";});
        await Check("DP01-PROFILE-DRAFT","Bảo vệ đủ vị trí ảnh",async()=>{
            var list=new List<Guid>();
            foreach(var place in new[]{"content","thumbnail","draft","avatar","background"}){
                var id=await Asset(aId);list.Add(id);var image=await Db(db=>db.MediaAssets.AsNoTracking().SingleAsync(x=>x.Id==id));
                if(place is "avatar" or "background") {var path=place=="avatar"?"/avatar":"/backGroundImg";Assert((await a.PatchAsJsonAsync($"/Account/{aId}",new[]{new{op="replace",path,value=image.Url}})).IsSuccessStatusCode,"profile attach");}
                else await Db(async db=>{db.Posts.Add(new Post{Title="Legacy reference "+place,Content=place=="thumbnail"?"<p>Thumbnail</p>":"<img src=\""+image.Url+"\">",Thumbnail=place=="thumbnail"?image.Url:null,IsPublished=place!="draft",AuthorId=aId});await db.SaveChangesAsync();return 0;});
            }
            using var scope=factory.Services.CreateScope();await scope.ServiceProvider.GetRequiredService<MediaLifecycle>().Cleanup(false,factory.Cloud);
            Assert(!await Db(db=>db.MediaAssets.AnyAsync(x=>list.Contains(x.Id)&&x.State=="Deleted")),"referenced photo deleted");
            return "Giữ ảnh content/thumbnail/nháp/avatar/background, gồm URL cũ chưa có MediaReference";
        });
        await Check("DP01-TWO-WORKERS","Hai worker cùng dọn",async()=>{var id=await Asset(aId);var row=await Db(db=>db.MediaAssets.AsNoTracking().SingleAsync(x=>x.Id==id));await Task.WhenAll(Enumerable.Range(0,2).Select(async n=>{using var scope=factory.Services.CreateScope();await scope.ServiceProvider.GetRequiredService<MediaLifecycle>().Cleanup(false,factory.Cloud);}));Assert(factory.Cloud.Deletes[row.PublicId]==1,"double delete");return "Hai worker: đúng một lần gọi xóa asset";});
        await Check("DP01-FOREIGN-ASSET","Không chiếm ảnh người khác",async()=>{var asset=await Asset(aId,1);var url=await Db(db=>db.MediaAssets.Where(x=>x.Id==asset).Select(x=>x.Url).SingleAsync());Assert((int)(await b.PostAsJsonAsync("/Post",PostData("<img src=\""+url+"\">"))).StatusCode==403,"foreign asset accepted");return "Editor B dùng ảnh A nhận 403, giao dịch rollback";});
        await Check("HC02-MIGRATION-RESUME","Gián đoạn và checkpoint",async()=>{
            var other=png.Concat(new byte[]{1}).ToArray();
            await Db(async db=>{db.Posts.Add(new Post{Title="Checkpoint",Content="<p>Giữ văn bản</p><img src=\"data:image/png;base64,"+Convert.ToBase64String(png)+"\"><img src=\"data:image/png;base64,"+Convert.ToBase64String(other)+"\">",AuthorId=aId,IsPublished=true});await db.SaveChangesAsync();return 0;});
            factory.Cloud.FailAtCall=factory.Cloud.UploadCalls+2;
            using var scope=factory.Services.CreateScope();var migration=scope.ServiceProvider.GetRequiredService<LegacyImageMigration>();
            var failed=JsonSerializer.SerializeToElement(await migration.Run(false));Assert(failed.GetProperty("pending").GetArrayLength()==1,"failure not recorded");
            Assert(await Db(db=>db.Posts.AnyAsync(x=>x.Title=="Checkpoint"&&x.Content.Contains("data:"))),"partial content saved");
            factory.Cloud.FailAtCall=-1;var calls=factory.Cloud.UploadCalls;
            var done=JsonSerializer.SerializeToElement(await migration.Run(false));Assert(done.GetProperty("converted").GetInt32()==1,"resume failed");Assert(factory.Cloud.UploadCalls==calls+1,"checkpoint image uploaded again");
            return "Lỗi ảnh thứ hai: bài cũ còn nguyên; chạy lại chỉ upload ảnh còn thiếu";
        });
        // New factory gives a fresh IP window; lockout remains in the same SQL database.
        factory.Dispose();factory=new SandboxFactory();using var login=Client();
        await Check("TC-DP03-02","5 sai khóa tài khoản",async()=>{for(int i=0;i<5;i++)Assert((int)(await login.PostAsJsonAsync("/Account/signIn",new{userName="lockeduser",password="wrong"})).StatusCode==401,"failure response");Assert((int)(await login.PostAsJsonAsync("/Account/signIn",new{userName="lockeduser",password})).StatusCode==401,"lockout bypass");var end=await Db(db=>db.Admins.Where(x=>x.UserName=="lockeduser").Select(x=>x.LockoutEnd).SingleAsync());Assert(end>DateTimeOffset.UtcNow.AddMinutes(14),"15m lockout missing");return "5 sai: khóa lưu SQL >14 phút; mật khẩu đúng vẫn 401";});
        await Check("DP03-ACCOUNT-CONCURRENT","5 sai đồng thời",async()=>{var responses=await Task.WhenAll(Enumerable.Range(0,5).Select(n=>login.PostAsJsonAsync("/Account/signIn",new{userName="paralleluser",password="wrong"})));Assert(responses.All(r=>(int)r.StatusCode==401),"parallel status");var end=await Db(db=>db.Admins.Where(u=>u.UserName=="paralleluser").Select(u=>u.LockoutEnd).SingleAsync());Assert(end>DateTimeOffset.UtcNow.AddMinutes(14),"parallel failures lost");return "5 yêu cầu sai đồng thời vẫn khóa tài khoản 15 phút trong SQL";});
        await Check("DP03-RESTART","Khóa còn sau tạo lại host",async()=>{using var reboot=new SandboxFactory();using var c=reboot.CreateClient();var response=await c.PostAsJsonAsync("/Account/signIn",new{userName="lockeduser",password});Assert((int)response.StatusCode==401,"restart bypassed lockout");return "Host/limiter mới vẫn nhận 401 vì khóa tài khoản lưu SQL";});
        await Check("TC-DP03-03","Hết khóa",async()=>{await Db(async db=>{var user=await db.Admins.SingleAsync(x=>x.UserName=="lockeduser");user.LockoutEnd=DateTimeOffset.UtcNow.AddSeconds(-1);await db.SaveChangesAsync();return 0;});Assert((await login.PostAsJsonAsync("/Account/signIn",new{userName="lockeduser",password})).IsSuccessStatusCode,"not unlocked");Assert(await Db(db=>db.Admins.Where(x=>x.UserName=="lockeduser").Select(x=>x.AccessFailedCount).SingleAsync())==0,"count not reset");return "Đặt LockoutEnd quá khứ trong fixture (mô phỏng 15 phút); đăng nhập được, đếm sai=0";});
        factory.Dispose();factory=new SandboxFactory();using var limit=Client();
        await Check("TC-DP03-04-05","21 lần và giả IP",async()=>{for(int i=0;i<20;i++){using var req=new HttpRequestMessage(HttpMethod.Post,"/Account/signIn"){Content=JsonContent.Create(new{userName="absent"+i,password="wrong"})};req.Headers.TryAddWithoutValidation("X-Forwarded-For","10.1.1."+i);Assert((int)(await limit.SendAsync(req)).StatusCode==401,"early limit");}var r=await limit.PostAsJsonAsync("/account/SIGNIN/",new{userName="maintadmin",password});Assert((int)r.StatusCode==429&&r.Headers.RetryAfter!=null,"21st not limited");return "20×401 rồi 429 + Retry-After; đổi XFF không qua được hạn";});
        await Check("WB-DP03-CONCURRENT","Hạn IP đồng thời",async()=>{var throttle=new LoginThrottle();var allowed=0;await Task.WhenAll(Enumerable.Range(0,40).Select(n=>Task.Run(()=>{if(throttle.Admit("parallel",out _))Interlocked.Increment(ref allowed);})));Assert(allowed==20,"atomic limit");return "40 tác vụ: đúng 20 được nhận";});
        factory.Dispose();factory=new SandboxFactory();
        await Check("RG03","Hồ sơ và bài công khai",async()=>{using var c=Client();Assert((await c.GetAsync("/AboutMe")).IsSuccessStatusCode,"AboutMe regression");Assert((await c.GetAsync("/Post")).IsSuccessStatusCode,"Post regression");return "AboutMe/Post 200 sau các ca lỗi/race";});
        Console.WriteLine("RESULTS " + results.Count);
        if (results.Any(r=>JsonSerializer.SerializeToElement(r).GetProperty("status").GetString() != "PASS")) Environment.ExitCode = 1;
    }
    static async Task Serve()
    {
        var builder=WebApplication.CreateBuilder();builder.WebHost.UseUrls("http://127.0.0.1:" + (Environment.GetEnvironmentVariable("MAINTENANCE_PORT") ?? "5191"));var app=builder.Build();
        app.Run(async ctx=>{
            if(ctx.Request.Path.StartsWithSegments("/sandbox-assets"))
            {var id=ctx.Request.Path.Value!["/sandbox-assets/".Length..].Replace(".png","");if(factory.Cloud.Files.TryGetValue(id,out var bytes)){ctx.Response.ContentType="image/png";await ctx.Response.Body.WriteAsync(bytes);return;}ctx.Response.StatusCode=404;return;}
            var client=factory.CreateClient();using var message=new HttpRequestMessage(new HttpMethod(ctx.Request.Method),ctx.Request.Path+ctx.Request.QueryString);
            if(ctx.Request.ContentLength>0||ctx.Request.Headers.ContainsKey("Transfer-Encoding"))message.Content=new StreamContent(ctx.Request.Body);
            foreach(var h in ctx.Request.Headers)if(h.Key!="Host"&&!message.Headers.TryAddWithoutValidation(h.Key,h.Value.ToArray()))message.Content?.Headers.TryAddWithoutValidation(h.Key,h.Value.ToArray());
            using var response=await client.SendAsync(message);ctx.Response.StatusCode=(int)response.StatusCode;
            foreach(var h in response.Headers)ctx.Response.Headers[h.Key]=h.Value.ToArray();foreach(var h in response.Content.Headers)ctx.Response.Headers[h.Key]=h.Value.ToArray();ctx.Response.Headers.Remove("transfer-encoding");
            if ((int)response.StatusCode != 204 && (int)response.StatusCode != 304) await response.Content.CopyToAsync(ctx.Response.Body);
        });await app.RunAsync();
    }
}
public static class HttpJsonExtensions
{
    public static Task<HttpResponseMessage> PatchAsJsonAsync<T>(this HttpClient client,string path,T data)
        => client.SendAsync(new HttpRequestMessage(HttpMethod.Patch,path){Content=JsonContent.Create(data)});
}
