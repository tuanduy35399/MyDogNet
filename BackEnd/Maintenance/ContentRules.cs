using System.Text;
using HtmlAgilityPack;
namespace BackEnd.Maintenance;
public static class ContentRules
{
    public const long MaxImageBytes = 5 * 1024 * 1024;
    public static HashSet<string> ImageUrls(string? content, params string?[] extra)
    {
        var doc = new HtmlDocument(); doc.LoadHtml(content ?? "");
        var urls = (doc.DocumentNode.SelectNodes("//img[@src]") ?? new HtmlNodeCollection(null))
            .Select(n => HtmlEntity.DeEntitize(n.GetAttributeValue("src", ""))).Concat(extra.OfType<string>());
        return urls.Where(x => !string.IsNullOrWhiteSpace(x)).ToHashSet(StringComparer.Ordinal);
    }
    public static string? Validate(string? title, string? content, string? thumbnail)
    {
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(content)) return "Tiêu đề và nội dung không được trống.";
        var decoded = HtmlEntity.DeEntitize(content);
        if (decoded.Contains("data:", StringComparison.OrdinalIgnoreCase) || (thumbnail?.Contains("data:", StringComparison.OrdinalIgnoreCase) ?? false))
            return "Ảnh base64 không được lưu trong bài. Hãy tải ảnh lên trước.";
        if (Encoding.UTF8.GetByteCount(content) > 1024 * 1024) return "Nội dung vượt 1 MiB.";
        var doc = new HtmlDocument(); doc.LoadHtml(content);
        if ((doc.DocumentNode.SelectNodes("//img")?.Count ?? 0) > 20) return "Một bài tối đa 20 ảnh nội dung.";
        foreach (var url in ImageUrls(content, thumbnail))
            if (!url.StartsWith('/') && (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != "https"))
                return "Địa chỉ ảnh phải là HTTPS hoặc đường dẫn ảnh nội bộ.";
        return null;
    }
    public static async Task<bool> IsImage(IFormFile file)
    {
        if (file.Length == 0 || file.Length > MaxImageBytes) return false;
        using var stream = file.OpenReadStream(); var bytes = new byte[12];
        var count = await stream.ReadAsync(bytes.AsMemory());
        return count >= 12 && ((bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[2] == 0xff && file.ContentType == "image/jpeg")
            || (bytes.AsSpan(0,8).SequenceEqual(new byte[]{137,80,78,71,13,10,26,10}) && file.ContentType == "image/png")
            || (Encoding.ASCII.GetString(bytes,0,4) == "RIFF" && Encoding.ASCII.GetString(bytes,8,4) == "WEBP" && file.ContentType == "image/webp"));
    }
}
