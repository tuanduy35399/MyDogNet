using BackEnd.Data;
using BackEnd.Models;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Json;
using System.Text.Json;

public static partial class Runner
{
    static async Task<JsonElement> Json(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>();
    static Task<HttpResponseMessage> Publish(HttpClient client, int id, bool value) => client.PatchAsJsonAsync($"/Post/{id}", new[] { new { op="replace",path="/isPublished",value } });
    static bool HasPost(JsonElement page, int id) => page.GetProperty("data").EnumerateArray().Any(x => x.GetProperty("id").GetInt32()==id);
    static async Task<int> Views(int id) => await Db(db => db.Posts.AsNoTracking().Where(x=>x.Id==id).Select(x=>x.ViewCount).SingleAsync());

    static async Task<(int draft, int published, int foreign)> SeedPublicationFixtures()
    {
        var aId=await Db(db=>db.Admins.Where(x=>x.UserName=="editorA").Select(x=>x.Id).SingleAsync());
        var bId=await Db(db=>db.Admins.Where(x=>x.UserName=="editorB").Select(x=>x.Id).SingleAsync());
        var ids=await Db(async db=>{
            var draft=new Post {Title="Bản nháp kiểm thử HT01", Content="<p>Nội dung nháp chỉ chủ bài và Admin được đọc.</p>", AuthorId=aId};
            var published=new Post {Title="Bài công khai kiểm thử HT03", Content="<p>Nội dung bài kiểm thử bộ đếm lượt xem.</p>", AuthorId=aId,IsPublished=true,ViewCount=7};
            var foreign=new Post {Title="Nháp của Editor B", Content="<p>Nội dung của người biên tập khác.</p>", AuthorId=bId};
            db.AddRange(draft,published,foreign);await db.SaveChangesAsync();return(draft.Id,published.Id,foreign.Id);
        });
        await File.WriteAllTextAsync(Path.Combine(output,"fixtures.json"),JsonSerializer.Serialize(new{draft=ids.Item1,published=ids.Item2,foreign=ids.Item3}));
        return ids;
    }

    static async Task PublicationChecks(bool baseline)
    {
        var (draft,published,foreign)=await SeedPublicationFixtures();
        using var a=Client(await Token("editorA"));using var b=Client(await Token("editorB"));using var admin=Client(await Token("maintadmin"));using var guest=Client();
        if(baseline)
        {
            var page=await Json(await a.GetAsync("/Post/manage"));
            var records=new[] {
                new {id="BASE-HT01-PATCH",actual=((int)(await Publish(a,draft,true)).StatusCode).ToString(),observation="PATCH trạng thái trước bảo trì"},
                new {id="BASE-HT01-LIST",actual=page.GetProperty("data")[0].TryGetProperty("isPublished",out _).ToString(),observation="Danh sách quản trị có isPublished"},
                new {id="BASE-HT03-VIEW",actual=((int)(await guest.PostAsync($"/Post/{published}/view",null)).StatusCode).ToString(),observation="Endpoint ghi lượt xem trước bảo trì"},
                new {id="BASE-HT01-CACHE",actual=(await guest.GetAsync($"/Post/{published}")).Headers.CacheControl?.ToString()??"absent",observation="Cache-Control bài công khai"}
            };
            await File.WriteAllTextAsync(Path.Combine(output,"baseline-results.json"),JsonSerializer.Serialize(records,new JsonSerializerOptions{WriteIndented=true}));
            foreach(var row in records)Console.WriteLine($"{row.id}: {row.actual}");return;
        }
        await Check("TC-HT01-01","Tạo nháp và cô lập công khai",async()=>{
            var made=await a.PostAsJsonAsync("/Post",new{title="Nháp tạo qua API",content="<p>Nội dung nháp.</p>"});Assert(made.IsSuccessStatusCode,"create draft");var id=(await Json(made)).GetProperty("id").GetInt32();
            var detail=await Json(await a.GetAsync($"/Post/manage/{id}"));Assert(!detail.GetProperty("isPublished").GetBoolean(),"default published");
            Assert((int)(await guest.GetAsync($"/Post/{id}")).StatusCode==404,"draft leaked");Assert(!HasPost(await Json(await guest.GetAsync("/Post?pageSize=50")),id),"listed draft");
            Assert(HasPost(await Json(await a.GetAsync("/Post/manage?status=draft&pageSize=50")),id),"missing owned draft");return "Nháp mặc định false; quản trị thấy; danh sách công khai không có; chi tiết 404.";
        });
        await Check("TC-HT01-02","Xuất bản bởi chủ bài",async()=>{Assert((await Publish(a,draft,true)).IsSuccessStatusCode,"publish failed");Assert((await guest.GetAsync($"/Post/{draft}")).IsSuccessStatusCode,"not public");Assert(HasPost(await Json(await guest.GetAsync("/Post?pageSize=50")),draft),"missing published");return "PATCH true thành công; khách đọc được danh sách và chi tiết.";});
        await Check("TC-HT01-03-ORIGIN","Thu hồi và cache tại API",async()=>{
            var read=await guest.GetAsync($"/Post/{draft}");Assert(read.Headers.CacheControl?.NoStore==true,"cacheable detail");Assert((await guest.GetAsync("/Post")).Headers.CacheControl?.NoStore==true,"cacheable list");
            Assert((await Publish(a,draft,false)).IsSuccessStatusCode,"withdraw failed");var req=new HttpRequestMessage(HttpMethod.Get,$"/Post/{draft}");req.Headers.TryAddWithoutValidation("If-None-Match","\"old\"");
            var after=await guest.SendAsync(req);Assert((int)after.StatusCode==404&&after.Headers.CacheControl?.NoStore==true,"old content or cache header");Assert(!HasPost(await Json(await guest.GetAsync("/Post?pageSize=50")),draft),"withdrawn listed");return "GET no-store; sau thu hồi GET có điều kiện trả 404, danh sách bỏ bài. Proxy kiểm tra riêng.";
        });
        await Check("TC-HT01-04","Trạng thái tác giả và thời gian UTC",async()=>{
            var old=await Json(await a.GetAsync($"/Post/manage/{draft}"));var before=DateTime.UtcNow;
            Assert((await a.PatchAsJsonAsync($"/Post/{draft}",new object[]{new{op="replace",path="/title",value=(object)"Nháp đã sửa"},new{op="replace",path="/isPublished",value=(object)true}})).IsSuccessStatusCode,"patch metadata");
            var data=await Json(await a.GetAsync($"/Post/manage/{draft}"));Assert(data.GetProperty("id").GetInt32()==draft&&data.GetProperty("isPublished").GetBoolean(),"id/state");Assert(data.GetProperty("authorName").GetString()=="editorA","author changed");
            Assert(data.GetProperty("createdAt").GetString()==old.GetProperty("createdAt").GetString(),"createdAt changed");var updated=data.GetProperty("updatedAt").GetDateTime();Assert(updated.Kind==DateTimeKind.Utc&&updated>=before,"UTC timestamp");return "Đọc lại đúng Id, true, editorA, CreatedAt giữ nguyên; UpdatedAt UTC tăng.";
        });
        await Check("TC-HT01-05","Quyền xem trước và đổi trạng thái",async()=>{
            Assert((int)(await guest.GetAsync($"/Post/manage/{foreign}")).StatusCode==401,"guest preview");Assert((int)(await a.GetAsync($"/Post/manage/{foreign}")).StatusCode==403,"foreign preview");
            Assert((int)(await Publish(a,foreign,true)).StatusCode==403,"foreign publish");Assert(!(await Db(db=>db.Posts.Where(x=>x.Id==foreign).Select(x=>x.IsPublished).SingleAsync())),"unauthorized mutation");return "Khách 401; Editor khác chủ 403; bài nháp không đổi.";
        });
        await Check("API-HT01-FILTER","Lọc trạng thái cùng quyền tìm và phân trang",async()=>{
            var all=await a.GetAsync("/Post/manage?pageNumber=1&pageSize=5");Assert(all.IsSuccessStatusCode,"omitted status rejected");
            Assert(HasPost(await Json(all),draft)&&HasPost(await Json(await a.GetAsync("/Post/manage?status=all&pageSize=50")),published),"all filter");
            var drafts=await Json(await a.GetAsync("/Post/manage?status=draft&pageSize=50"));Assert(drafts.GetProperty("data").EnumerateArray().All(x=>!x.GetProperty("isPublished").GetBoolean()),"draft filter");Assert(!HasPost(drafts,foreign),"foreign draft listed");
            var publicRows=await Json(await a.GetAsync("/Post/manage?status=published&pageSize=50"));Assert(publicRows.GetProperty("data").EnumerateArray().All(x=>x.GetProperty("isPublished").GetBoolean()),"published filter");Assert((int)(await a.GetAsync("/Post/manage?status=invalid")).StatusCode==400,"invalid filter");
            var search=await Json(await a.GetAsync("/Post/manage?status=published&pageSize=1&searchTerm=HT03"));Assert(search.GetProperty("totalRecords").GetInt32()==1&&HasPost(search,published),"filter count/search");return "all/draft/published, tổng số và tìm kiếm khớp; không lộ bài B; trạng thái sai 400.";
        });
        await Check("API-HT01-ADMIN","Admin đổi trạng thái bài của Editor",async()=>{Assert((await Publish(admin,foreign,true)).IsSuccessStatusCode,"admin publish");Assert((await Publish(admin,foreign,false)).IsSuccessStatusCode,"admin withdraw");return "Admin xuất bản/thu hồi bài của Editor B thành công.";});
        await Check("API-HT01-VALIDATION","Boolean và whitelist PATCH",async()=>{
            foreach(var value in new object?[]{"true",null,1})Assert((int)(await a.PatchAsJsonAsync($"/Post/{draft}",new[]{new{op="replace",path="/isPublished",value}})).StatusCode==400,"nonboolean accepted");
            Assert((int)(await a.PatchAsJsonAsync($"/Post/{draft}",new[]{new{op="replace",path="/viewCount",value=999}})).StatusCode==400,"counter writable");
            Assert((await Json(await a.GetAsync($"/Post/manage/{draft}"))).GetProperty("isPublished").GetBoolean(),"invalid patch mutated state");return "Chuỗi/null/số bị chặn; không sửa trực tiếp ViewCount; trạng thái giữ nguyên.";
        });
        await Check("API-HT01-PRESERVE","Sửa nội dung không tự đổi trạng thái",async()=>{Assert((await a.PatchAsJsonAsync($"/Post/{draft}",new[]{new{op="replace",path="/content",value="<p>Chỉ sửa nội dung.</p>"}})).IsSuccessStatusCode,"edit content");Assert((await Json(await a.GetAsync($"/Post/manage/{draft}"))).GetProperty("isPublished").GetBoolean(),"implicit withdrawal");return "PATCH nội dung giữ IsPublished=true.";});
        await Check("API-HT03-ATOMIC","Một lượt và GET chỉ đọc",async()=>{
            var initial=await Views(published);var timestamp=await Db(db=>db.Posts.Where(x=>x.Id==published).Select(x=>x.UpdatedAt).SingleAsync());for(int i=0;i<3;i++)await guest.GetAsync($"/Post/{published}");Assert(await Views(published)==initial,"GET increments");
            var response=await guest.PostAsync($"/Post/{published}/view",null);Assert(response.IsSuccessStatusCode,"view rejected");Assert((await Json(response)).GetProperty("viewCount").GetInt32()==initial+1&&await Views(published)==initial+1,"incorrect increment");Assert(await Db(db=>db.Posts.Where(x=>x.Id==published).Select(x=>x.UpdatedAt).SingleAsync())==timestamp,"view changed UpdatedAt");return "Ba GET không tăng; một POST tăng đúng 1, trả số mới; UpdatedAt không đổi.";
        });
        await Check("TC-HT03-02","Nháp không tồn tại và preview",async()=>{
            var initial=await Views(foreign);Assert((int)(await guest.PostAsync($"/Post/{foreign}/view",null)).StatusCode==404,"draft view");Assert((int)(await guest.PostAsync("/Post/2147483647/view",null)).StatusCode==404,"missing view");
            for(int i=0;i<3;i++)await b.GetAsync($"/Post/manage/{foreign}");Assert(await Views(foreign)==initial,"preview counted");return "POST nháp/id thiếu 404; ba lần GET preview không tăng lượt.";
        });
        await Check("TC-HT03-03","20 lượt đồng thời trên SQL thật",async()=>{
            var initial=await Views(published);var responses=await Task.WhenAll(Enumerable.Range(0,20).Select(_=>guest.PostAsync($"/Post/{published}/view",null)));Assert(responses.All(x=>x.IsSuccessStatusCode),"concurrent failure");var values=new List<int>();foreach(var response in responses)values.Add((await Json(response)).GetProperty("viewCount").GetInt32());Assert(await Views(published)==initial+20&&values.Distinct().Count()==20,"lost updates or stale return");return $"20×200; V0={initial}, V1={await Views(published)}; 20 giá trị trả về khác nhau.";
        });
        await Check("API-HT03-UNTRUSTED","Không nhận số đếm do khách truyền",async()=>{var initial=await Views(published);var response=await guest.PostAsJsonAsync($"/Post/{published}/view",new{viewCount=999999});Assert(response.IsSuccessStatusCode&&await Views(published)==initial+1,"client supplied count");return "Body viewCount=999999 vẫn chỉ tăng đúng 1.";});
        await Check("API-HT03-WITHDRAW-RACE","Ghi lượt và thu hồi tranh chấp",async()=>{
            Assert((await Publish(a,published,true)).IsSuccessStatusCode,"publish fixture");var requests=Enumerable.Range(0,20).Select(_=>guest.PostAsync($"/Post/{published}/view",null)).ToArray();var withdraw=await Publish(a,published,false);var responses=await Task.WhenAll(requests);Assert(withdraw.IsSuccessStatusCode,"withdraw");Assert(responses.All(x=>(int)x.StatusCode is 200 or 404),"race server error");
            var count=await Views(published);Assert((int)(await guest.PostAsync($"/Post/{published}/view",null)).StatusCode==404&&await Views(published)==count,"counts after withdrawal");return "20 lượt tranh chấp chỉ 200/404; sau commit thu hồi, POST 404 và số đếm giữ nguyên.";
        });
        await Check("RG-HT02","Hồi quy tham số và ký tự tìm kiếm",async()=>{
            foreach(var query in new[]{"pageNumber=0","pageSize=0","pageSize=51"})Assert((int)(await guest.GetAsync("/Post?"+query)).StatusCode==400,"pagination boundary");
            var created=await a.PostAsJsonAsync("/Post",new{title="C# & .NET + HT01?",content="<p>Bài hồi quy tìm kiếm.</p>",isPublished=true});Assert(created.IsSuccessStatusCode,"create regression");var id=(await Json(created)).GetProperty("id").GetInt32();var page=await Json(await guest.GetAsync("/Post?searchTerm="+Uri.EscapeDataString("C# & .NET + HT01?")));Assert(page.GetProperty("totalRecords").GetInt32()==1&&HasPost(page,id),"special characters");return "page/size biên sai 400; &, +, ? tìm đúng một bài công khai.";
        });
        await Check("RG-HT01-MEDIA","Nháp giữ tham chiếu ảnh DP01",async()=>{
            var uploaded=await Json(await Upload(a));var url=uploaded.GetProperty("url").GetString()!;var created=await a.PostAsJsonAsync("/Post",new{title="Nháp có ảnh",content="<p>Ảnh nháp</p><img src=\""+url+"\">",isPublished=false});Assert(created.IsSuccessStatusCode,"draft image save");var id=(await Json(created)).GetProperty("id").GetInt32();Assert(await Db(db=>db.MediaReferences.AnyAsync(x=>x.PostId==id)),"missing draft media ref");return "Tạo nháp có URL FakeCloud vẫn ghi MediaReference trong SQL.";
        });
        if(results.Any(x=>JsonSerializer.SerializeToElement(x).GetProperty("status").GetString()=="FAIL"))Environment.ExitCode=1;
    }
}
