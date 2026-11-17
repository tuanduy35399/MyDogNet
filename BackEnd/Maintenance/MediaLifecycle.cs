using BackEnd.Data;
using BackEnd.Models;
using BackEnd.Services;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
namespace BackEnd.Maintenance;
public sealed class MediaLifecycle
{
    private readonly ApplicationDbContext db;
    public MediaLifecycle(ApplicationDbContext db) => this.db = db;
    // Caller opens a transaction. Ordered UPDLOCKs serialize saves with cleanup claims.
    public async Task SyncReferences(ClaimsPrincipal user, HashSet<string> urls, int? postId = null, string? adminId = null)
    {
        var ids = await db.MediaAssets.Where(x => urls.Contains(x.Url)).OrderBy(x => x.Id).Select(x => x.Id).ToListAsync();
        var assets = new List<MediaAsset>();
        foreach (var id in ids)
        {
            var asset = await db.MediaAssets.FromSqlInterpolated($"SELECT * FROM MediaAssets WITH (UPDLOCK, ROWLOCK) WHERE Id={id}").SingleAsync();
            await db.Entry(asset).ReloadAsync();
            if (asset.State is "Deleting" or "Deleted") throw new InvalidOperationException("Ảnh đang được dọn hoặc đã xóa; hãy tải lại ảnh.");
            if (!user.IsInRole("Admin") && asset.OwnerId != user.FindFirstValue(ClaimTypes.NameIdentifier))
                throw new UnauthorizedAccessException("Bạn không có quyền sử dụng ảnh này.");
            assets.Add(asset);
        }
        var old = db.MediaReferences.Where(x => postId != null ? x.PostId == postId : x.AdminId == adminId);
        db.MediaReferences.RemoveRange(old);
        foreach (var asset in assets)
        {
            asset.State = "Used";
            db.MediaReferences.Add(new MediaReference { MediaAssetId = asset.Id, PostId = postId, AdminId = adminId });
        }
        await db.SaveChangesAsync();
    }
    private async Task<bool> Referenced(MediaAsset a) =>
        await db.MediaReferences.AnyAsync(x => x.MediaAssetId == a.Id)
        || await db.Posts.AnyAsync(x => x.Thumbnail == a.Url || x.Content.Contains(a.Url))
        || await db.Admins.AnyAsync(x => x.Avatar == a.Url || x.BackGroundImg == a.Url);

    public async Task<object> Cleanup(bool dryRun, ICloudinaryServices cloud, CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow.AddHours(-24);
        var staleClaim = DateTime.UtcNow.AddHours(-1);
        var ids = await db.MediaAssets.Where(x => x.CreatedAt < cutoff && x.Attempts < 3 &&
            (x.State == "Temp" || x.State == "DeleteFailed" || (x.State == "Deleting" && x.ClaimedAt < staleClaim)))
            .OrderBy(x => x.Id).Select(x => x.Id).Take(100).ToListAsync(ct);
        var candidates = new List<Guid>(); var deleted = 0; var failed = 0;
        foreach (var id in ids)
        {
            await using (var tx = await db.Database.BeginTransactionAsync(ct))
            {
                var a = await db.MediaAssets.FromSqlInterpolated($"SELECT * FROM MediaAssets WITH (UPDLOCK, ROWLOCK) WHERE Id={id}").SingleAsync(ct);
                await db.Entry(a).ReloadAsync(ct);
                if ((a.State != "Temp" && a.State != "DeleteFailed" && !(a.State == "Deleting" && a.ClaimedAt < staleClaim))
                    || a.Attempts >= 3 || await Referenced(a)) continue;
                candidates.Add(id);
                if (dryRun) continue;
                a.State = "Deleting"; a.ClaimedAt = DateTime.UtcNow; a.Attempts++;
                await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
            }
            var asset = await db.MediaAssets.SingleAsync(x => x.Id == id, ct);
            // Saves cannot attach a Deleting asset; legacy references are rechecked before deletion.
            if (await Referenced(asset)) { asset.State = "Used"; await db.SaveChangesAsync(ct); continue; }
            try { await cloud.DeleteImageAsync(asset.PublicId); asset.State = "Deleted"; deleted++; }
            catch { asset.State = "DeleteFailed"; failed++; }
            await db.SaveChangesAsync(ct);
        }
        return new { dryRun, candidates, deleted, failed };
    }
}
public sealed class MediaCleanupWorker : BackgroundService
{
    private readonly IServiceProvider services;
    private readonly IConfiguration config;
    private readonly ILogger<MediaCleanupWorker> logger;
    public MediaCleanupWorker(IServiceProvider services, IConfiguration config, ILogger<MediaCleanupWorker> logger)
        => (this.services, this.config, this.logger) = (services, config, logger);
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!config.GetValue<bool>("MediaCleanup:Enabled")) return;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = services.CreateScope();
                var dryRun = !config.GetValue<bool>("MediaCleanup:AllowDelete");
                var report = await scope.ServiceProvider.GetRequiredService<MediaLifecycle>().Cleanup(dryRun,
                    scope.ServiceProvider.GetRequiredService<ICloudinaryServices>(), stoppingToken);
                logger.LogInformation("Media cleanup {Report}", System.Text.Json.JsonSerializer.Serialize(report));
            }
            catch (Exception ex) { logger.LogWarning("Media cleanup failed: {Type}", ex.GetType().Name); }
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }
}
