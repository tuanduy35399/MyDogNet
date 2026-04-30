using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace BackEnd.Services
{
    public class CloudinaryService : ICloudinaryServices
    {
        private readonly Cloudinary _cloudinary; //_cloudinary tạo kết nối tới Cloudinary
        public CloudinaryService(IConfiguration config)
        {
            var account = new Account( //lớp Account của SDK Cloudinary
                config["CloudinaryConfig:CloudName"],
                config["CloudinaryConfig:ApiKey"],
                config["CloudinaryConfig:ApiSecret"]
                );
            _cloudinary = new Cloudinary(account);
            
        }
        public async Task<string> UploadImageAsync(IFormFile file)
        {
            //đọc luồng dữ liệu trong file mà người dùng upload từ máy tính
            //nên dùng using khi:
            /*
             File mở từ ổ đĩa
            Kết nối database
            Socket mạng
            Stream đọc/ghi
            Nhằm giải phóng tự động sau khi đã dùng
             */
            using var stream = file.OpenReadStream();

            //Tạo 1 obj chứa thông tin ảnh để upload
            //Hàm này chứa trong SDK của cloudinary 
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream)
            };

            var result = await _cloudinary.UploadAsync(uploadParams);
            return result.SecureUrl.ToString();
        }

    }
}
