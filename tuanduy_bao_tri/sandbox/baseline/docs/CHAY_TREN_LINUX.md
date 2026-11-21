# Chạy MyDogNet trên Linux bằng VS Code

Mở **thư mục MyDogNet** (nơi có `BackEnd/`, `front-end/`, `scripts/`), không chỉ mở riêng `BackEnd/`. Máy này có sẵn file **`MyDogNet.code-workspace` trong thư mục Project 2**; mở file đó bằng VS Code sẽ chọn đúng thư mục và cấu hình F5. Backend là ASP.NET Core 6 Web API, frontend là React/Vite; SQL Server lưu tài khoản và bài viết, Cloudinary lưu ảnh upload. Không cần IIS Express hoặc Visual Studio để chạy.

## 1. Chạy trên máy này lần đầu

.NET SDK **6.0.428**, runtime **6.0.36**, tiện ích **C#** của VS Code và thư viện BE/FE đã được cài trong phiên thiết lập. Cấu hình local cũng đã được sinh. PATH cho .NET đã thêm vào `~/.bashrc` và `~/.profile`; mở terminal mới sẽ dùng được `dotnet`. Với terminal cũ, chạy:

```bash
export DOTNET_ROOT="$HOME/.dotnet"
export PATH="$DOTNET_ROOT:$DOTNET_ROOT/tools:$PATH"
cd '/home/duypy/Documents/Project 2/source code/MyDogNet'
code .
```

Các lệnh `bash scripts/dev.sh ...` tự tìm SDK trong `~/.dotnet`, kể cả khi bạn chưa nạp PATH mới. SDK cài theo tài khoản hiện tại, không cần cài lại toàn hệ thống.

**Terminal 1 — bật SQL Server và tạo bảng:**

```bash
cd '/home/duypy/Documents/Project 2/source code/MyDogNet'
sudo docker compose up -d --wait db
bash scripts/dev.sh migrate
bash scripts/dev.sh backend
```

Lệnh `sudo` sẽ yêu cầu mật khẩu đăng nhập Linux của bạn. Nếu tài khoản đã dùng Docker được, có thể dùng `bash scripts/dev.sh db-up` thay cho dòng `sudo`. Lần đầu cần tải image SQL Server; đợi đến khi dịch vụ báo `Healthy`. Backend sẵn sàng khi thấy `Now listening on: http://localhost:5091`.

Máy hiện có container `sqlserver` ở cổng 1433. MyDogNet dùng **14333** để tránh trùng và giữ nguyên CSDL đó. Nếu terminal đang ở `Project 2` hoặc thư mục khác, có thể bật đúng container bằng lệnh có đường dẫn đầy đủ:

```bash
sudo docker compose --project-directory '/home/duypy/Documents/Project 2/source code/MyDogNet' up -d --wait db
```

**Terminal 2 — tạo dữ liệu mẫu rồi chạy giao diện:**

```bash
cd '/home/duypy/Documents/Project 2/source code/MyDogNet'
bash scripts/dev.sh seed
bash scripts/dev.sh frontend
```

Mở:

- Website: <http://localhost:5173>
- Swagger để xem/thử API: <http://localhost:5091/swagger>
- Đăng nhập giao diện hiện tại: <http://localhost:5173/admin-signin-80820508>

Lệnh `seed` dành cho CSDL **MyDogNetLocal mới**, tạo tài khoản `localadmin`, hồ sơ và một bài mẫu. Mật khẩu sinh ngẫu nhiên nằm trong **`.local/dev-account.json`**; mở file này trên máy để xem. Chạy lại khi đã có hồ sơ sẽ giữ nguyên dữ liệu. Bản FE hiện tại chờ hồ sơ từ `/AboutMe`, nên CSDL trống có thể làm trang chủ quay loading; hãy tạo hồ sơ rồi tải lại trang. Lệnh seed không cần Cloudinary và không lấy tài khoản/dữ liệu trên website đã deploy.

## 2. Các lần sau và cách dừng

Khi đã có bảng và dữ liệu, chỉ cần bật lại DB, chạy backend ở một terminal và frontend ở terminal khác:

```bash
sudo docker compose up -d --wait db
bash scripts/dev.sh backend
# Terminal khác:
bash scripts/dev.sh frontend
```

Nhấn **Ctrl+C** trong từng terminal để dừng BE/FE. Dừng SQL Server bằng `sudo docker compose stop db`; dữ liệu vẫn nằm trong volume. `docker compose down -v` sẽ xóa volume và mất CSDL local, nên không dùng khi chỉ muốn dừng.

## 3. File môi trường nằm ở đâu?

| File | Ai đọc? | Điền gì? |
| --- | --- | --- |
| `BackEnd/appsettings.json` | ASP.NET ở mọi môi trường | Cấu hình chung, không để mật khẩu |
| `BackEnd/appsettings.Development.json` | ASP.NET khi Development | Cấu hình phát triển dùng chung |
| **`BackEnd/appsettings.Local.json`** | Backend khi Development, đã thêm trong `Program.cs` | Kết nối SQL, JWT, CORS, Cloudinary riêng của máy |
| **`.env`** tại MyDogNet | Docker Compose | `MSSQL_SA_PASSWORD` cho SQL Server local |
| **`front-end/.env.local`** | Vite | `VITE_API_URL=http://localhost:5091` |
| `.local/dev-account.json` | Lệnh seed | Tài khoản thử để bạn đăng nhập |

ASP.NET Core **không tự đọc `.env`** như Vite. Dự án này dùng JSON local cho BE, nên không cần thêm thư viện dotenv. Tên file Linux phân biệt hoa/thường. Các file local chứa thông tin riêng đã được `.gitignore` bỏ qua; chỉ các file `.example` được chia sẻ. File JSON local cũng được loại khỏi output publish.

`bash scripts/dev.sh init` sinh mật khẩu SQL và khóa JWT ngẫu nhiên, dùng cùng mật khẩu SQL trong `.env` và JSON; không ghi đè file có sẵn. Sửa cấu hình backend xong cần khởi động lại BE; sửa `.env.local` xong cần khởi động lại Vite.

## 4. Kết nối SQL Server

Cấu hình mặc định trong `BackEnd/appsettings.Local.json` có dạng:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,14333;Database=MyDogNetLocal;User Id=sa;Password=MAT_KHAU_SQL_LOCAL;Encrypt=True;TrustServerCertificate=True;"
  }
}
```

Đây là ví dụ một phần file: **chỉ sửa trường tương ứng**, giữ các phần JWT/CORS/Cloudinary còn lại. Mật khẩu thật đã được sinh sẵn trong file trên máy. `TrustServerCertificate=True` dùng cho SQL local với chứng chỉ tự ký; máy chủ khác cần thiết lập chứng chỉ phù hợp.

- `Server`: IP/tên máy và cổng SQL. `localhost,14333` là container trên máy này; dấu phân cách SQL là **dấu phẩy**, không phải dấu hai chấm.
- `Database`: tên CSDL, mặc định là `MyDogNetLocal`.
- `User Id` / `Password`: tài khoản **SQL Server**, khác tài khoản đăng nhập website.
- Linux không có Windows LocalDB hoặc `Trusted_Connection=True` kiểu máy Visual Studio cũ. Dùng SQL Authentication cho cấu hình này.
- Muốn dùng CSDL cũ: điền host/cổng/tên DB/tài khoản SQL bạn có vào JSON; không cần chạy Docker local. Xác nhận đúng CSDL và sao lưu trước khi áp dụng migration vào dữ liệu có sẵn. Không chạy `seed` trên CSDL cũ.

Mật khẩu `sa` là thông tin khởi tạo volume mới. Nếu volume đã tồn tại, chỉ sửa `.env` không tự đổi mật khẩu bên trong SQL Server. Giữ mật khẩu hiện tại hoặc đổi bằng câu lệnh SQL phù hợp; không xóa volume để thử khi còn dữ liệu cần giữ.

VS Code đã có tiện ích **SQL Server (mssql)**. Dùng lệnh **MS SQL: Connect** và nhập Server `localhost,14333`, Authentication `SQL Login`, User `sa`, mật khẩu lấy từ file local, Database `MyDogNetLocal`; chấp nhận chứng chỉ tự ký cho kết nối local. Bạn có thể mở file `.sql` rồi chạy `SELECT TOP (10) * FROM Posts;` để xem bài viết.

## 5. JWT, CORS và Cloudinary

`JWT.SecretKey` dùng ký token khi đăng nhập; đã sinh khóa đủ dài. `ValidIssuer` là `http://localhost:5091`. `ValidAudience` giữ **`Admin`** để khớp cách FE hiện kiểm tra token; đây là cấu hình tương thích với mã hiện có. Những thay đổi phân quyền trong kế hoạch bảo trì vẫn cần triển khai riêng.

`Cors.AllowedOrigins` cho phép FE local ở `http://localhost:5173` và `http://127.0.0.1:5173` gọi BE. Nếu đổi cổng FE, cập nhật danh sách này. Script FE cố định cổng và báo lỗi khi cổng bận để tránh Vite tự chuyển cổng gây lỗi CORS.

Trong `CloudinaryConfig`, điền **CloudName**, **ApiKey**, **ApiSecret** từ tài khoản Cloudinary của bạn. Có thể thử API, đăng nhập, đọc/tạo bài văn bản trước khi điền; upload ảnh cần đủ ba giá trị. Tuyệt đối không đưa ApiSecret, mật khẩu SQL hoặc JWT secret vào biến `VITE_...` vì các biến đó xuất hiện trong trình duyệt.

Máy này đã được điền đủ cấu hình Cloudinary trong JSON local và khởi động lại backend. Ngày 16/11/2026 đã kiểm tra `/Upload` với JWT local: trả HTTP 200 và URL HTTPS, tải lại ảnh khớp nội dung ảnh thử; ảnh thử đã được dọn khỏi Cloudinary. Đây là kiểm tra API upload hiện có; luồng chèn ảnh trong Quill cần thực hiện riêng theo HC02 để thay ảnh base64 bằng URL.

Để override bằng biến môi trường thay vì sửa JSON, dùng `__` để tách các cấp, ví dụ `ConnectionStrings__DefaultConnection`, `JWT__SecretKey`, `CloudinaryConfig__ApiSecret`. Biến môi trường và tham số dòng lệnh được ưu tiên hơn JSON local. Nếu đã cấu hình User Secrets từ trước, JSON local được nạp sau nó trong cấu hình Development hiện tại.

## 6. Chạy và đặt breakpoint bằng F5

1. Mở đúng thư mục **MyDogNet** trong VS Code. Nếu đang mở `Project 2`, chọn File → Open Folder và mở `source code/MyDogNet` để VS Code nhận `.vscode/`.
2. Cài tiện ích **C#** của Microsoft nếu VS Code gợi ý. Máy này đã cài; có thể cần Reload Window để kích hoạt.
3. Bật SQL Server và chạy `migrate` như mục 1. Chạy FE riêng bằng `bash scripts/dev.sh frontend`.
4. Nếu BE đang chạy bằng terminal, nhấn Ctrl+C trước để giải phóng cổng 5091.
5. Vào **Run and Debug**, chọn **MyDogNet: Backend (Linux)** rồi nhấn **F5**. Cấu hình sẽ build BE, chạy file DLL và mở Swagger. Log nằm ở **Debug Console**.
6. Bấm vào lề trái một dòng trong `Controllers/PostController.cs` để đặt breakpoint, gọi `GET /Post` từ Swagger; VS Code sẽ dừng ở dòng đó. **F10** đi bước tiếp, **F11** đi vào hàm, **F5** chạy tiếp, **Shift+F5** dừng.

**Terminal → Run Task** cũng có các tác vụ build BE, chạy BE, chạy FE và migration. Bản `.slnx` cũ không được SDK 6 hỗ trợ; các lệnh hiện tại chỉ định trực tiếp `BackEnd.csproj`, nên không cần mở solution đó.

## 7. Nhắc lại ASP.NET qua chính dự án này

Luồng một request: **React → Controller → Repository hoặc DbContext → SQL Server → DTO/JSON → React**.

| Thành phần | Nên đọc để nhớ lại |
| --- | --- |
| `Program.cs` | Điểm khởi động: đọc cấu hình, đăng ký DI/EF/Identity/JWT/CORS, gắn middleware và controller |
| `Controllers/` | Địa chỉ API, nhận request, trả HTTP response; thử trước qua Swagger |
| `DTOs/` | Dữ liệu request/response, tránh truyền thẳng toàn bộ entity |
| `Models/` | `Post`, `Admin`: dữ liệu và quan hệ |
| `Data/ApplicationDbContext.cs` | EF Core, tập bảng `Posts`, Identity và tài khoản |
| `Repositories/AccountRepository.cs` | Tạo tài khoản, kiểm tra mật khẩu và tạo JWT |
| `Services/CloudinaryService.cs` | Upload ảnh sang Cloudinary |
| `Migrations/` | Lịch sử tạo/thay đổi bảng, không phải dữ liệu bài viết cũ |

Chạy `dotnet` trực tiếp sau khi đã export PATH:

```bash
# Tại thư mục MyDogNet:
dotnet restore BackEnd/BackEnd.csproj
dotnet tool restore
dotnet build BackEnd/BackEnd.csproj
dotnet run --project BackEnd/BackEnd.csproj --launch-profile Linux

# Dừng BE trước khi build/migration để tránh lỗi Text file busy trên Linux:
cd BackEnd
ASPNETCORE_ENVIRONMENT=Development dotnet ef database update

# Chỉ khi sau này bạn thay model và muốn thêm thay đổi CSDL:
ASPNETCORE_ENVIRONMENT=Development dotnet ef migrations add TenThayDoi
```

Trong Visual Studio trước đây: `Update-Database` tương ứng `dotnet ef database update`; `Add-Migration Ten` tương ứng `dotnet ef migrations add Ten`. Chạy dự án lần đầu **không cần tạo lại Initial migration** vì đã có sẵn ba migration.

## 8. Khi gặp lỗi

| Biểu hiện | Kiểm tra |
| --- | --- |
| `dotnet: command not found` | Export PATH như mục 1 hoặc dùng `scripts/dev.sh` |
| Không tìm thấy SDK phù hợp | `~/.dotnet/dotnet --list-sdks`; `global.json` cần SDK 6.0.428; chạy `bash scripts/dev.sh install-dotnet` trên máy mới |
| `permission denied ... docker.sock` | Dùng `sudo docker compose ...`; không đổi quyền socket thành 666 |
| `no configuration file provided: not found` | Bạn đang đứng ngoài MyDogNet. `cd` đúng thư mục hoặc dùng `--project-directory` với đường dẫn đầy đủ ở mục 1 |
| Docker daemon chưa chạy | `sudo systemctl start docker`, rồi chạy lại Compose |
| SQL chưa healthy | `sudo docker compose ps`, `sudo docker compose logs --tail 50 db`; kiểm tra RAM, cổng 14333 và mật khẩu SQL |
| SQL login failed / error 18456 | So khớp mật khẩu trong JSON với SQL/`.env`, kiểm tra volume cũ |
| `Invalid object name Posts/AspNetUsers` | Đã kết nối được nhưng chưa có bảng: chạy `bash scripts/dev.sh migrate` |
| Trang chủ loading mãi | Kiểm tra `/AboutMe`, `/Post`, log BE và hồ sơ đầu tiên; với DB local mới chạy seed rồi tải lại |
| CORS hoặc FE gọi sai máy chủ | Kiểm tra `.env.local`, CORS và khởi động lại BE/FE sau khi đổi file |
| Không vào được trang admin sau đăng nhập | Xóa token cũ trong Local Storage, đăng nhập lại; token hiện hết hạn sau 20 phút |
| Upload báo thiếu Cloudinary | Điền ba khóa ở JSON local, khởi động lại backend |
| `Address already in use` | Dừng BE cũ trước khi bấm F5; chỉ chạy một backend trên cổng 5091 |
| `Text file busy` khi build/migrate | Nhấn Ctrl+C để dừng BE đang chạy, chạy lại lệnh build/migrate, rồi bật BE lại |
| Cảnh báo nullable/using trùng khi build | Mã hiện có còn cảnh báo; xem `0 Error(s)` để phân biệt build thành công |

## 9. Thiết lập lại trên một máy Linux khác

Cần Docker Engine + Compose, Python 3, curl, VS Code và Node đáp ứng Vite 8 (Node 22.12+ hoặc bản mới tương thích; máy này đang dùng Node 26). Tại MyDogNet chạy:

```bash
bash scripts/dev.sh install-dotnet
bash scripts/dev.sh init
bash scripts/dev.sh restore
```

Sau đó làm theo mục 1. .NET 6 đã hết hỗ trợ; cấu hình này giữ nguyên phiên bản để chạy lại dự án cũ. Việc nâng nền tảng nên làm trong một thay đổi riêng sau khi đã có bản chạy ổn định.

Sơ đồ chỉnh sửa được: [local-development.drawio](diagrams/local-development.drawio). Bản xem: [local-development.svg](diagrams/local-development.svg). Máy chưa có draw.io Desktop nên xuất SVG thay cho PNG; file draw.io đã qua kiểm tra cấu trúc và đường nối không giao nhau. Nguồn YAML/sidecar nằm ở `.drawio-tmp/local-development/` (được bỏ qua khi commit).

Tham khảo chính thức: [ASP.NET Configuration](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/?view=aspnetcore-6.0), [EF Core CLI](https://learn.microsoft.com/en-us/ef/core/cli/dotnet), [SQL Server Docker](https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-docker?view=sql-server-ver16), [VS Code C# Debugging](https://code.visualstudio.com/docs/csharp/debugger-settings).

## 10. Đã kiểm tra trên máy này — 16/11/2026

- Cài và chạy được SDK 6.0.428 / runtime 6.0.36 trên Ubuntu hiện tại; terminal mới nhận lệnh `dotnet`.
- Restore thư viện BE/FE và EF CLI 6.0.36 thành công; build backend và `npm run build` đều thành công.
- Tạo CSDL `MyDogNetLocal` trên cổng 14333; áp dụng thành công cả ba migration hiện có. Container `sqlserver` cũ ở cổng 1433 được giữ nguyên.
- Backend chạy ở `http://localhost:5091`; Swagger và CORS cho frontend local đã kiểm tra thành công.
- Tạo tài khoản/hồ sơ `localadmin` và một bài mẫu qua API; kiểm tra đọc bài trên website, đăng nhập quản trị, tải lại vẫn giữ phiên đăng nhập và xem bài mẫu trong Post Manager. Chạy lại seed giữ nguyên dữ liệu.
- Kiểm tra file cấu hình riêng được Git bỏ qua và không xuất hiện trong bản publish. Sơ đồ draw.io đã kiểm tra cấu trúc; bản SVG xuất ra đã được xem để rà chữ, bố cục và đường nối.

**Giới hạn:** chưa chuyển luồng ảnh nội dung Quill từ base64 sang URL (HC02). Cấu hình F5 đã chuẩn bị; phiên kiểm tra chạy BE bằng terminal, chưa thao tác debugger trong cửa sổ VS Code. Mã cũ còn cảnh báo nullable/using trùng; FE có cảnh báo kích thước bundle và `npm ci` báo 18 vấn đề bảo mật trong cây thư viện hiện có (2 thấp, 4 vừa, 12 cao). Việc nâng thư viện/nền tảng và sửa các yêu cầu bảo trì chức năng được tách khỏi lần thiết lập môi trường này.
