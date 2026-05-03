# MyDogNet
Just a web portfolio to get know more about me LOL

Qua project này tôi học được gì?

Cách xây dựng BE theo kiểu Repository Pattern tuân thủ SOLID

=> Giảm sự phụ thuộc của các class, chỉ cần biết Interface 

Các xác thực authentication, tạo token, duy trì đăng nhập

Tất nhiên không thể thiếu đó là CRUD

Tạo class DTO trung gian để xử lý đầu vào và đầu ra trước khi đến tay user

Biết cách tích hợp lưu ảnh trên cloudinary
Biết cách lưu meta data, lưu content dạng HTML, user sẽ tạo 1 bài post 
với nội dung kiểu đa dạng như file word có chèn hình ảnh thay vì text bình thường
như 1 app todolist bằng cách kết hợp với thư viện Quill bên FE
Luồng xử lý như này:

Người dùng nhập text -> giữa bài thì nhấp chèn hình -> gọi API up hình lên cloudinary
-> trả về url -> tạo thẻ image chèn src chứa url -> đăng bài thì gọi API đăng post

Tuy nhiên 1 bài toán đặt ra là khi người dùng chèn hình -> gọi API cloudinary và up hình (thì nó đã được lưu trên cloud
rồi trả về url trước khi user bấm đăng bài). Nếu người dùng đổi ý định không đăng bài,
hoặc rớt mạng thì tất cả post coi như mất, bài chưa được đăng mà hình thì lại lưu trên cloud
=> xảy ra tình trạng orphan files
Có 3 hướng giải quyết 
Cách 1 — Kệ nó (đơn giản nhất): nhiều app nhỏ dùng luôn cách này

Cách 2 — Dọn rác định kỳ (khuyên dùng)

👉 lưu publicId của ảnh vào DB tạm

✔ Flow
Upload ảnh → lưu publicId (status = temp)
   ↓
User đăng bài → mark used
   ↓
Cron job (1 ngày/lần):
   → xóa ảnh chưa dùng

Ví dụ DB
ImageTable
- Id
- PublicId
- Url
- IsUsed (true/false)
- CreatedAt

Cron job
Xóa ảnh:
WHERE IsUsed = false AND CreatedAt < 1 day


Cách 3 — Upload sau khi submit (không khuyến khích)
User viết xong mới upload

👉 nhưng:

❌ UX rất tệ
❌ chờ lâu
❌ khó xử lý editor

Cách 4: pro hơn (Facebook/Medium style)

👉 khi upload:

Folder = "temp"

👉 khi đăng bài:

Move ảnh từ temp → posts

👉 nếu không dùng:

xóa folder temp định kỳ


Sau khi tham khảo thì tôi quyết định dùng cách 4

Khi upload:
var uploadParams = new ImageUploadParams
{
    File = new FileDescription(file.FileName, stream),
    Folder = "temp"
};
✔ khi create post:

👉 parse content:

<img src=".../temp/...">

→ đổi thành:

/posts/

(hoặc giữ nguyên cũng được nếu bạn không cần phân loại)

✔ job xóa rác:
xóa ảnh trong temp > 24h
🔥 6. Cloudinary hỗ trợ xóa không?

👉 có:

await _cloudinary.DestroyAsync(new DeletionParams(publicId));


Còn về phía FrontEnd thì tôi đã học được

Sử dụng template, source css từ bootstrap
Tạo trang 404 not found
Dùng React Context để duy trì data sau khi đã đăng nhập
Dùng ProtectRoute để ẩn trang admin
