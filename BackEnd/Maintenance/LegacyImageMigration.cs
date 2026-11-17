using BackEnd.Data;
using BackEnd.Models;
using BackEnd.Services;
using HtmlAgilityPack;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography;
namespace BackEnd.Maintenance;
public sealed class LegacyImageMigration
{
    private readonly ApplicationDbContext db;
    private readonly ICloudinaryServices cloud;
    private readonly MediaLifecycle media;
    public LegacyImageMigration(ApplicationDbContext db, ICloudinaryServices cloud, MediaLifecycle media)
        => (this.db, this.cloud, this.media) = (db, cloud, media);
    public async Task<object> Run(bool dryRun)
    {
        var ids = await db.Posts.Where(p => p.Content.Contains("data:")).Select(p => p.Id).ToListAsync();
        var converted = 0; var pending = new List<int>(); var images = 0;
        foreach (var id in ids)
        {
            var post = await db.Posts.AsNoTracking().SingleAsync(p => p.Id == id);
            var original = post.Content;
            var doc = new HtmlDocument(); doc.LoadHtml(original);
            var nodes = doc.DocumentNode.SelectNodes("//img[@src]")?.Where(n => n.GetAttributeValue("src", "").StartsWith("data:", StringComparison.OrdinalIgnoreCase)).ToList() ?? new();
            images += nodes.Count;
            if (dryRun) continue;
            try
            {
                if (nodes.Count > 20) throw new InvalidOperationException("Too many images");
                foreach (var node in nodes)
                {
                    var src = HtmlEntity.DeEntitize(node.GetAttributeValue("src", ""));
                    var comma = src.IndexOf(',');
                    if (comma < 0 || comma > 40 || !src[..comma].EndsWith(";base64", StringComparison.OrdinalIgnoreCase) || src.Length > 7 * 1024 * 1024) throw new InvalidOperationException("Unsupported inline image");
                    var type = src[5..src.IndexOf(';')];
                    var bytes = Convert.FromBase64String(src[(comma+1)..]);
                    using var stream = new MemoryStream(bytes);
                    var file = new FormFile(stream, 0, bytes.Length, "file", "legacy-image") { Headers = new HeaderDictionary(), ContentType = type };
                    if (!await ContentRules.IsImage(file)) throw new InvalidOperationException("Invalid image");
                    var key = "mydognet/legacy/" + id + "_" + Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant()[..24];
                    var asset = await db.MediaAssets.SingleOrDefaultAsync(a => a.PublicId == key);
                    if (asset == null || asset.State == "Deleted")
                    {
                        var result = await cloud.UploadImageAsync(file, key);
                        if (asset == null) { asset = new MediaAsset { OwnerId = post.AuthorId, PublicId = result.PublicId }; db.Add(asset); }
                        asset.Url = result.Url; asset.State = "Temp"; asset.CreatedAt = DateTime.UtcNow;
                        await db.SaveChangesAsync();
                    }
                    node.SetAttributeValue("src", asset.Url);
                }
                var content = doc.DocumentNode.OuterHtml;
                if (ContentRules.Validate(post.Title, content, post.Thumbnail) != null) throw new InvalidOperationException("Post validation failed");
                await using var tx = await db.Database.BeginTransactionAsync();
                var live = await db.Posts.FromSqlInterpolated($"SELECT * FROM Posts WITH (UPDLOCK, ROWLOCK) WHERE Id={id}").SingleAsync();
                if (live.Content != original) throw new InvalidOperationException("Post changed during migration");
                var actor = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Role, "Admin") }, "migration"));
                await media.SyncReferences(actor, ContentRules.ImageUrls(content, live.Thumbnail), postId: id);
                live.Content = content; live.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(); await tx.CommitAsync(); converted++;
            }
            catch { db.ChangeTracker.Clear(); pending.Add(id); }
        }
        return new { dryRun, scanned = ids.Count, images, converted, pending };
    }
}
