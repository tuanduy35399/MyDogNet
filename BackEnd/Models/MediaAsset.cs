using System.ComponentModel.DataAnnotations;
namespace BackEnd.Models;
public class MediaAsset
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(450)] public string OwnerId { get; set; } = "";
    [MaxLength(200)] public string PublicId { get; set; } = "";
    [MaxLength(2048)] public string Url { get; set; } = "";
    [MaxLength(20)] public string State { get; set; } = "Temp";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClaimedAt { get; set; }
    public int Attempts { get; set; }
}
public class MediaReference
{
    public int Id { get; set; }
    public Guid MediaAssetId { get; set; }
    public MediaAsset MediaAsset { get; set; } = null!;
    public int? PostId { get; set; }
    public Post? Post { get; set; }
    [MaxLength(450)] public string? AdminId { get; set; }
    public Admin? Admin { get; set; }
}
