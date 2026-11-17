namespace BackEnd.Services;
public record UploadedImage(string PublicId, string Url);
public interface ICloudinaryServices
{
    Task<UploadedImage> UploadImageAsync(IFormFile file, string? migrationKey = null);
    Task DeleteImageAsync(string publicId);
}
