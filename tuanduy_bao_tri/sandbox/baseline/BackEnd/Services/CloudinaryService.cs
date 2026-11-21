using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace BackEnd.Services
{
    public class CloudinaryService : ICloudinaryServices
    {
        private readonly Cloudinary _cloudinary;

        public CloudinaryService(IConfiguration config)
        {
            // 1. Lấy thông tin cấu hình
            var cloudName = config["CloudinaryConfig:CloudName"];
            var apiKey = config["CloudinaryConfig:ApiKey"];
            var apiSecret = config["CloudinaryConfig:ApiSecret"];

            // 2. Kiểm tra xem có bị thiếu key không
            if (string.IsNullOrEmpty(cloudName) || string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(apiSecret))
            {
                throw new Exception("Lỗi: Thông tin CloudinaryConfig trong appsettings.json bị trống hoặc sai tên!");
            }

            // 3. Khởi tạo account và đối tượng Cloudinary
            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account);
        }

        public async Task<string> UploadImageAsync(IFormFile file)
        {
            // Kiểm tra biến _cloudinary trước khi dùng để tránh lỗi dòng 49
            if (_cloudinary == null)
            {
                throw new Exception("Đối tượng Cloudinary chưa được khởi tạo thành công.");
            }

            if (file == null || file.Length == 0) throw new Exception("File không hợp lệ.");

            using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = "temp"
            };

            var result = await _cloudinary.UploadAsync(uploadParams);

            // Kiểm tra nếu Cloudinary trả về lỗi (ví dụ sai Key)
            if (result.Error != null)
            {
                throw new Exception($"Cloudinary Error: {result.Error.Message}");
            }

            return result.SecureUrl.ToString();
        }
    }
}

