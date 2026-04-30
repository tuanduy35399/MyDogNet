namespace BackEnd.Services
{
    public interface ICloudinaryServices
    {
        Task<string> UploadImageAsync(IFormFile file);
    }
}
