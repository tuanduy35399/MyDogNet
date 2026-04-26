using CloudinaryDotNet;

namespace BackEnd.Services
{
    public class CloudinaryService
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

    }
}
