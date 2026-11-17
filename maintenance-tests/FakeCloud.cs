using BackEnd.Services;
using System.Collections.Concurrent;
public sealed class FakeCloud : ICloudinaryServices
{
    public ConcurrentDictionary<string, byte[]> Files { get; } = new();
    public ConcurrentDictionary<string,int> Deletes { get; } = new();
    public bool FailUpload, FailDelete;
    public int UploadCalls, FailAtCall = -1;
    public int DelayMilliseconds;
    public async Task<UploadedImage> UploadImageAsync(IFormFile file, string? migrationKey = null)
    {
        if (DelayMilliseconds > 0) await Task.Delay(DelayMilliseconds);
        var call = Interlocked.Increment(ref UploadCalls);
        if (FailUpload || call == FailAtCall) throw new IOException("Injected upload outage");
        var id = migrationKey ?? "sandbox/" + Guid.NewGuid().ToString("N");
        using var m = new MemoryStream(); await file.CopyToAsync(m); Files[id] = m.ToArray();
        return new(id, "/sandbox-assets/" + id + ".png");
    }
    public Task DeleteImageAsync(string publicId)
    {
        if (FailDelete) throw new IOException("Injected delete outage");
        Files.TryRemove(publicId, out _); Deletes.AddOrUpdate(publicId, 1, (_, n) => n+1);
        return Task.CompletedTask;
    }
}
