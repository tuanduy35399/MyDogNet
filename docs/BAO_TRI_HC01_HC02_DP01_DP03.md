# Vận hành sau bảo trì HC01 HC02 DP01 DP03

Bản sửa giữ ASP.NET Core 6, bổ sung HtmlAgilityPack để phân tích ảnh HTML. Chạy sandbox trước khi cập nhật môi trường có dữ liệu. Báo cáo và bằng chứng nằm ở `../../tuanduy_bao_tri/` tính từ thư mục MyDogNet.

## Cập nhật môi trường local đang có

Dừng backend trước khi build/migration để tránh lỗi Text file busy trên Linux. Sao lưu SQL và nội dung bài cũ trước khi chuyển đổi ảnh.

```bash
bash scripts/dev.sh restore
bash scripts/dev.sh migrate
# Cấp đúng vai trò cho chủ hệ thống đã có, không tự nâng mọi tài khoản:
dotnet run --project BackEnd --launch-profile Linux -- --grant-admin=localadmin
# Tài khoản biên tập cũ, nếu có:
# dotnet run --project BackEnd --launch-profile Linux -- --grant-editor=ten_tai_khoan
bash scripts/dev.sh backend
```

Đăng nhập lại để nhận JWT có role mới. Token cũ không có role sẽ bị API quản trị từ chối. Trang danh sách/cấp tài khoản chỉ Admin được dùng. Editor chỉ sửa/xóa bài và hồ sơ của mình. Admin tạo tài khoản mới qua POST `/Account/signUp`, `role` nhận `Admin` hoặc `Editor` (mặc định Editor).

`Account/signUp` không còn công khai. Với CSDL hoàn toàn mới, tạo tài khoản đầu tiên bằng quy trình cấp tài khoản offline có kiểm soát; không mở tạm endpoint đăng ký ra ngoài. Bộ sandbox có fixture tạo tài khoản thử bằng UserManager, chỉ chạy vào CSDL có tên MyDogNetMaintenanceAfter. `scripts/dev.sh seed` cũ không dùng để tạo tài khoản đầu tiên sau HC01.

## Ảnh nội dung mới và ảnh cũ

Toolbar, paste tệp/HTML data URI và drop tệp dùng một component. Trong lúc upload, nút lưu bị khóa. API từ chối data URI, trên 20 ảnh, trên 1 MiB JSON; upload nhận JPEG/PNG/WebP theo MIME/chữ ký, tối đa 5 MiB mỗi tệp. Đường dẫn ảnh cũ không có bản ghi MediaAsset vẫn được giữ để tránh mất dữ liệu.

Chạy chuyển ảnh base64 ngoài request trang chủ:

```bash
dotnet run --project BackEnd --launch-profile Linux -- --convert-base64=dry-run
# Sau khi xem danh sách, kiểm tra backup và dữ liệu thử:
dotnet run --project BackEnd --launch-profile Linux -- --convert-base64=apply
```

Lệnh apply lưu bản sao JSON bài có data URI trong `BackEnd/.local/legacy-backup-*.json`. Bản sao JSON không thay thế backup SQL đầy đủ. Mỗi ảnh có PublicId xác định từ bài và checksum; bản ghi MediaAsset là checkpoint. Bài chỉ được đổi Content khi tất cả ảnh thành công và Content gốc chưa bị người khác sửa. `pending` khác rỗng cần xử lý rồi chạy lại. Ảnh được chèn trong HTML được hỗ trợ; inline CSS/background data URI hoặc quá giới hạn sẽ được giữ pending để xử lý thủ công, không âm thầm bỏ ảnh.

## Dọn ảnh DP01

Mặc định job chưa chạy xóa thật. Cấu hình trong JSON local hoặc biến môi trường:

```json
"MediaCleanup": {
  "Enabled": true,
  "AllowDelete": false
}
```

Job chạy khi khởi động rồi mỗi 24 giờ, dry-run khi AllowDelete=false. Xem ứng viên qua POST `/Maintenance/media-cleanup?dryRun=true` bằng Admin. Sau đối soát mới bật AllowDelete và gọi `dryRun=false` hoặc để lịch chạy. Chỉ xét MediaAsset Temp/DeleteFailed quá 24 giờ, batch tối đa 100, không còn tham chiếu trong bài/nháp/thumbnail/hồ sơ, thử tối đa 3 lần. Used được giữ kể cả khi gỡ khỏi bài. Không quét xóa cả thư mục temp, không dọn ảnh cũ chưa được đăng ký.

Trạng thái Deleting được lưu trước khi gọi Cloudinary; thao tác lưu không gắn ảnh ở trạng thái này. Claim bỏ dở quá 1 giờ được xem xét lại. Dịch vụ xóa báo lỗi thì ghi DeleteFailed, không ghi Deleted. Nếu Cloudinary thành công nhưng cập nhật SQL gián đoạn, việc gọi lại destroy theo PublicId chấp nhận not found để hoàn tất. Khi có nhiều API instance, cần một lịch điều phối phù hợp; khóa SQL vẫn ngăn hai worker claim cùng ảnh.

## Giới hạn đăng nhập DP03

20 POST đăng nhập trong cửa sổ trượt 60 giây theo IP kết nối; request 21 nhận 429 và Retry-After, gồm route khác hoa/thường và có slash cuối. Năm lần sai khóa 15 phút trong Identity SQL, kể cả các lần sai đồng thời; phản hồi sai tên/sai mật khẩu/đang khóa đều 401 chung. Header X-Forwarded-For chỉ được tin sau khi cấu hình IP proxy cụ thể trong `Security:KnownProxies`; mặc định không tin header khách gửi.

Bộ đếm IP là bộ nhớ một instance, tối đa 10000 IP đang hoạt động; khởi động lại đặt lại cửa sổ IP, không xóa lockout SQL. Trước khi triển khai nhiều instance phải thay limiter bằng kho dùng chung hoặc giới hạn tại gateway; chưa có kiểm thử nhiều instance/gateway thật.

## Chạy kiểm thử lại

`maintenance-tests/` chứa console harness dùng WebApplicationFactory, SQL riêng và FakeCloud để tái hiện lỗi, race và retry. Không dùng key Cloudinary thật trong harness. Xem hướng dẫn sandbox trong báo cáo Markdown để chuẩn bị connection string bằng biến môi trường; tuyệt đối không đưa mật khẩu vào báo cáo hoặc commit.

Chạy nhanh trên Linux từ thư mục MyDogNet:

```bash
python3 maintenance-tests/run.py
```

Script đọc cấu hình SQL local, tự tạo tên CSDL kiểm thử mới và JWT thử; giữ kết quả riêng tại `.local/maintenance/runs/`. Không dùng CSDL MyDogNetLocal làm dữ liệu thử và không gọi Cloudinary thật. SQL Server local phải đang hoạt động. Các CSDL thử được giữ lại để đối chiếu, không tự xóa.
