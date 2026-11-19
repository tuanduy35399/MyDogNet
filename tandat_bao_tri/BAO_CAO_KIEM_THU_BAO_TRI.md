# BÁO CÁO KIỂM THỬ VÀ BẢO TRÌ PHẦN MỀM MYDOGNET
**Phân hệ 3 yêu cầu: HC03, HC04, HT02**

- **Học phần**: Bảo trì phần mềm và Quản lý hệ thống (CT244)
- **Người thực hiện**: Tấn Đạt (Kỹ sư Kiểm thử và Bảo trì Phần mềm)
- **Nhánh Git làm việc**: `baotri_pm` (Mốc xuất phát: `1d0ddc344d3be4c9297831cc1875ea8acb8f5ace`)
- **Ngày thực hiện & Cập nhật**: 17 tháng 11 năm 2026
- **Trạng thái thực tế**: **ĐÃ SỬA THẬT MÃ NGUỒN VÀ THỰC THI 18/18 CA KIỂM THỬ ĐẠT TRÊN SANDBOX**

---

## CẬP NHẬT THỰC HIỆN NGÀY 17 THÁNG 11 NĂM 2026

Đã sửa mã nguồn ba mục **HC03**, **HC04**, **HT02** và thực thi 18 kịch bản kiểm thử tự động cô lập (gồm 6 ca API/CSDL Backend trên xUnit + InMemory Database và 12 ca giao diện/DOM/bất đồng bộ Frontend trên Vitest + JSDOM): **18 đạt, 0 không đạt** ở lần chạy cuối. Các luồng giao diện 404/500, chống tràn màn hình đa viewport (320px, 360px, 390px, 768px, 1366px), tìm kiếm ký tự đặc biệt (`&`, `+`, `?`) và phân trang hai cấp đã có bằng chứng tự động. Kết quả được xác nhận trong môi trường sandbox cô lập, chưa phải nghiệm thu production.

### Bảng tóm tắt thực hiện 3 yêu cầu bảo trì

| Mã | Phân loại | Thực hiện trong mã nguồn | Kết quả và giới hạn |
| :--- | :--- | :--- | :--- |
| **HC03** | Hiệu chỉnh (P1) | Thêm `finally` kết thúc loading; phân định lỗi 404 và lỗi kết nối/500 kèm UI phản hồi; dùng `AbortController` có timeout 15s và cờ `!controller.signal.aborted` chặn race condition khi đổi route; bỏ độ trễ giả 800ms; tách trạng thái tải để lỗi `AboutMe` không khóa `Home`. | 4 ca giao diện đạt (TC-HC03-01 → 04); timeout và hủy request mô phỏng bằng harness; chưa đo trên đường truyền 3G thực tế. |
| **HC04** | Hiệu chỉnh (P1) | Bật lại `background-position: center;` và dùng `background-attachment: scroll;` trên di động; nội dung văn bản thêm `overflow-wrap: anywhere; word-break: break-word;`; thẻ `pre`/`code` cuộn ngang nội bộ `overflow-x: auto;`; ảnh nội dung đặt `max-inline-size: 100%; height: auto; block-size: auto;` và override `img[style]`. | 4 ca DOM đạt (TC-HC04-01 → 04); đo kiểm tra rule và container không tràn; chưa đo trên thiết bị vật lý gập màn hình. |
| **HT02** | Hoàn thiện (P2) | Backend chặn `pageNumber < 1` và `pageSize` ngoài 1–50 bằng `400 Bad Request`; sắp xếp ổn định `CreatedAt` giảm dần rồi `Id` giảm dần; Frontend gửi query bằng `params` của Axios thay cho nối chuỗi thô; thêm nút Tìm kiếm, Xóa lọc, empty state; bổ sung thanh phân trang và dialog xác nhận xóa chuẩn mực ở `PostManager`, tự lùi trang khi xóa bài cuối. | 6 ca Backend đạt + 4 ca Frontend đạt (TC-HT02-01 → 05); kiểm tra trên database InMemory và mock API; chưa thử tải trên 100.000 bài viết. |

---

## 1. MÔ TẢ CHI TIẾT HIỆN TRẠNG LỖI, LÝ DO BẢO TRÌ VÀ GIẢI PHÁP THỰC HIỆN

### 1.1. Yêu cầu HC03: Sửa trạng thái tải không kết thúc khi lấy dữ liệu thất bại (Hiệu chỉnh - P1)

- **Mô tả hiện trạng và nguyên nhân gốc rễ**:
  - Tại `front-end/page/PostDetail/PostDetail.jsx`: State `isLoading` ban đầu là `true`. Hàm `fetchData()` gọi `axiosClient.get('/post/${id}')`. Dòng lệnh `setIsLoading(false)` chỉ nằm trong khối `.then()` sau độ trễ nhân tạo 800ms (`setTimeout 800`). Khi API trả về 404 (bài viết không tồn tại), 500 (lỗi máy chủ) hoặc mạng bị ngắt, nhánh `catch (err)` chỉ ghi log ra console và **hoàn toàn không gọi `setIsLoading(false)`**. Người dùng bị kẹt lại màn hình chờ (khung skeleton `placeholder-glow` nhấp nháy vô tận) mà không hề có thông báo bài viết không tồn tại hay lỗi kết nối.
  - Ngoài ra, nếu `post` là `null`, dòng 93 `dangerouslySetInnerHTML={{ __html: normalizeContent(post.content) }}` gây crash component (`Cannot read properties of null`).
  - Tại `front-end/page/Home/Home.jsx`: Biến `isLoading = isListLoading || !user;`. Nếu API `/AboutMe` lỗi, `user` bằng `null` vĩnh viễn, khiến toàn bộ trang chủ bị kẹt spinner loading mãi mãi dù danh sách bài viết đã lấy thành công.
  - Thiếu cơ chế hủy request (`AbortController`): Khi người dùng click chuyển nhanh giữa hai bài viết (từ A sang B), request của bài A vẫn chạy và phản hồi chậm của A có thể ghi đè làm sai lệch dữ liệu bài B.
- **Lý do cần bảo trì**:
  - Vi phạm nguyên tắc sống còn của ứng dụng web: "Mọi tác vụ bất đồng bộ phải có điểm dừng xác định và thông báo trạng thái rõ ràng cho người dùng". Gây hiểu nhầm là hệ thống bị treo hoặc đơ mạng.
- **Quá trình khắc phục trong mã nguồn**:
  - Trong `PostDetail.jsx`:
    1. Đưa `setIsLoading(false)` vào khối `finally` để đảm bảo luôn kết thúc trạng thái tải.
    2. Bổ sung các trạng thái rõ ràng: `isLoading`, `errorType` (`"404"` | `"error"` | `null`), `errorMessage`, và `reloadKey`.
    3. Khi gặp 404: Hiển thị card cảnh báo thân thiện `"404 - Không tìm thấy bài viết hoặc bài viết đã bị xóa"` kèm nút `"Về trang chủ"`.
    4. Khi gặp 500 / Network Error: Hiển thị card `"Sự cố kết nối"` kèm nút `"Thử lại"` (`reloadKey + 1`) và nút `"Về trang chủ"`.
    5. Khởi tạo `const controller = new AbortController();` với timeout tự động 15 giây. Khi unmount hoặc đổi ID bài viết, gọi `controller.abort()`. Sau khi `await axiosClient.get`, kiểm tra `if (!controller.signal.aborted)` trước khi gán `setPost(res.data)` nhằm loại bỏ triệt để lỗi race condition.
    6. Xóa bỏ độ trễ giả tạo 800ms.
  - Trong `front-end/context/UserContext.jsx`: Bổ sung `isUserLoading` và `userError` vào context, bắt lỗi an toàn không làm sập ứng dụng.
  - Trong `front-end/page/Home/Home.jsx`: Đặt `isLoading = isListLoading;`, tách riêng trạng thái hồ sơ cá nhân để lỗi `/AboutMe` không khóa vĩnh viễn trang chủ.

---

### 1.2. Yêu cầu HC04: Sửa ảnh và nội dung bị lệch hoặc tràn ngang trên điện thoại (Hiệu chỉnh - P1)

- **Mô tả hiện trạng và nguyên nhân gốc rễ**:
  - Đo DOM ở viewport di động (320px, 360px, 390px) cho thấy `document.documentElement.scrollWidth` lên tới 587px, vượt xa `clientWidth` (360px). Người dùng phải cuộn ngang để đọc bài, bố cục bị vỡ.
  - Nguyên nhân 1: Trong `Header.module.css`, dòng `/* background-position: center; */` bị comment out, đồng thời dùng `background-attachment: fixed;`. Trên trình duyệt di động, thuộc tính `fixed` gây lỗi căn chỉnh khiến ảnh nền header bị méo mó, phóng to và lệch tâm.
  - Nguyên nhân 2: Bài viết chứa chuỗi ký tự dài liên tục không có dấu cách (như token JWT, link URL). Trình duyệt mặc định không tự ngắt dòng (`overflow-wrap: normal`), đẩy toàn bộ trang rộng ngang.
  - Nguyên nhân 3: Các khối code `<pre>` / `<code>` không có quy tắc cuộn ngang cục bộ (`overflow-x: auto`), kéo giãn layout ra ngoài viewport.
  - Nguyên nhân 4: Ảnh nội dung chỉ có `max-width: 100%`, nhưng nếu ảnh có inline-style chiều rộng cứng từ editor (ví dụ: `style="width: 1200px;"`), ảnh sẽ bung tràn màn hình.
- **Lý do cần bảo trì**:
  - Giao diện di động chiếm phần lớn lượng người đọc. Thanh cuộn ngang toàn trang gây khó chịu và che mất các nút điều hướng. Cần đáp ứng tiêu chí nghiệm thu: `scrollWidth <= clientWidth + 1px` trên các viewport 320px, 360px, 390px, 768px, 1366px.
- **Quá trình khắc phục trong mã nguồn**:
  - Trong `front-end/components/Header/Header.module.css`:
    1. Bật lại `background-position: center; background-size: cover;`.
    2. Đặt `background-attachment: scroll;` trên thiết bị di động (`@media (max-width: 768px)`), chỉ dùng `fixed` trên máy tính để bàn.
    3. Thêm `min-width: 0; box-sizing: border-box;` cho `.header-container` và ngắt dòng an toàn cho tiêu đề.
  - Trong `front-end/page/PostDetail/PostDetail.css` & `front-end/page/About/About.module.css`:
    1. Áp dụng cho `.post-content`: `overflow-wrap: anywhere; word-break: break-word; min-width: 0;`.
    2. Áp dụng cho ảnh: `max-inline-size: 100%; max-width: 100%; block-size: auto; height: auto; display: block;`.
    3. Override inline-style của ảnh: `.post-content img[style] { max-width: 100% !important; height: auto !important; }`.
    4. Cho phép cuộn ngang nội bộ cho code: `.post-content pre, .post-content code { max-width: 100%; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }`.
    5. Giới hạn bảng, iframe, video: `max-width: 100%; overflow-x: auto;`.
  - Trong `front-end/src/index.css`:
    1. Toàn cục: `*, *::before, *::after { box-sizing: border-box; }`.
    2. Cấu hình `#root`: `width: 100%; max-width: 100%; overflow-x: hidden;`.

---

### 1.3. Yêu cầu HT02: Hoàn thiện tìm kiếm và phân trang bài viết (Hoàn thiện - P2)

- **Mô tả hiện trạng và nguyên nhân gốc rễ**:
  - **Backend (`BackEnd/Controllers/PostController.cs`)**:
    - Hàm `GetPosts(int pageNumber = 1, int pageSize = 5, string? searchTerm = null)` không kiểm tra hợp lệ tham số đầu vào. Nếu client truyền `pageNumber < 1`, biểu thức `(pageNumber - 1) * pageSize` sẽ thành số âm, làm ném ngoại lệ trong EF Core. Nếu `pageSize = 0` hoặc quá lớn (ví dụ 1000), hệ thống không có giới hạn phòng vệ. Đặc tả AC-HT02-03 yêu cầu từ chối bằng `400 Bad Request`.
    - Sắp xếp chỉ có `.OrderByDescending(p => p.CreatedAt)`. Nếu hai bài có cùng thời điểm tạo, phân trang SQL Server sẽ không xác định (unstable pagination), dẫn đến bài viết bị lặp hoặc bị sót giữa các trang. Đặc tả yêu cầu: `.OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id)`.
  - **Frontend (`ListPost.jsx` & `PostManager.jsx`)**:
    - Nối chuỗi URL thô: ``/post?pageNumber=${page}&pageSize=${pageSize}&searchTerm=${searchTerm}``. Nếu từ khóa tìm kiếm chứa ký tự đặc biệt như `&`, `+`, `?` (ví dụ: `C# & .NET`), ký tự `&` bị hiểu là phân tách tham số HTTP mới, `+` bị decode thành dấu cách, làm hỏng truy vấn.
    - `ListPost.jsx` chỉ tìm khi nhấn Enter, không có nút Tìm kiếm chuột và nút Xóa bộ lọc; khi kết quả rỗng thì để trống danh sách không thông báo.
    - `PostManager.jsx` (quản trị) khai báo state `page` và `totalPages` nhưng trong JSX hoàn toàn không hiển thị thanh phân trang. Người quản trị không thể duyệt qua trang 2, 3...
    - Khi xóa bài viết cuối cùng của trang trong admin, không có cơ chế lùi về trang trước, khiến bảng bị rỗng.
    - Hộp thoại xóa dùng từ ngữ thô tục ("Mày có chắc...", "Xóa rồi là đ*o khôi phục...", "Xóa mẹ đi").
- **Lý do cần bảo trì**:
  - Bảo vệ tính ổn định và an toàn của API Backend; đảm bảo tính toàn vẹn của kết quả tìm kiếm với mọi ký tự kỹ thuật; hoàn thiện trải nghiệm quản trị bài viết văn minh, tiện lợi.
- **Quá trình khắc phục trong mã nguồn**:
  - Trong `BackEnd/Controllers/PostController.cs`:
    1. Thêm validation: `if (pageNumber < 1 || pageSize < 1 || pageSize > 50) return BadRequest(...);`.
    2. Sắp xếp ổn định hai cấp: `.OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id)`.
    3. Lọc an toàn với `searchTerm.Trim()` và đếm `totalRecords` trên chính query đã lọc.
  - Trong `front-end/components/ListPost/ListPost.jsx`:
    1. Chuyển sang dùng `params` của Axios: `{ pageNumber: page, pageSize, searchTerm: searchTerm || undefined }`.
    2. Bổ sung nút bấm `"Tìm"` và nút `"Xóa lọc"`.
    3. Thêm giao diện empty state: thông báo `"Không tìm thấy bài viết nào phù hợp với từ khóa..."` và nút `"Xem tất cả bài viết"`.
    4. Phân trang: Vô hiệu hóa nút Previous ở trang 1, Next ở trang cuối.
  - Trong `front-end/page/Admin/manage/Post/PostManager.jsx`:
    1. Chuyển sang dùng Axios `params`.
    2. Thêm thanh phân trang Bootstrap đầy đủ bên dưới bảng.
    3. Thêm logic tự động lùi trang: `if (posts.length === 1 && page > 1) setPage(p => p - 1);`.
    4. Chuẩn hóa dialog xóa lịch sự: `"Xác nhận xóa bài viết - Bạn có chắc chắn muốn xóa bài viết này không? Dữ liệu sau khi xóa sẽ không thể phục hồi."` kèm nút `"Hủy bỏ"` và `"Xác nhận xóa"`.

---

## 2. THIẾT KẾ MÔI TRƯỜNG SANDBOX VÀ PHƯƠNG PHÁP KIỂM THỬ

Môi trường kiểm thử được thiết lập theo nguyên tắc **cô lập hoàn toàn (Isolated Sandbox)**, đảm bảo:
1. **Không can thiệp vào CSDL production**: Backend sandbox chạy trên `Microsoft.EntityFrameworkCore.InMemory` với database GUID ngẫu nhiên riêng biệt cho mỗi ca kiểm thử.
2. **Không phụ thuộc mạng ngoài**: Frontend sandbox chạy trên `Vitest` và `JSDOM`, sử dụng `vi.mock` để giả lập các tình huống API (200, 404, 500, Timeout, Trì hoãn response).

### Cấu trúc mã nguồn kiểm thử đã tạo
- `MyDogNet/BackEnd.Tests/PostControllerTests.cs`: 6 ca kiểm thử xUnit cho API phân trang, kiểm tra biên và tìm kiếm ký tự đặc biệt.
- `MyDogNet/front-end/tests/HC03.test.jsx`: 4 ca kiểm thử Vitest cho luồng xử lý lỗi, skeleton, timeout, race condition và hồ sơ AboutMe.
- `MyDogNet/front-end/tests/HC04.test.jsx`: 4 ca kiểm thử Vitest cho CSS responsive, text-wrap, code block và header.
- `MyDogNet/front-end/tests/HT02.test.jsx`: 4 ca kiểm thử Vitest cho tìm kiếm ký tự đặc biệt, empty state, phân trang client và admin.
- `MyDogNet/front-end/tests/setup.js`: Polyfill JSDOM cho `window.scrollTo` và `HTMLDialogElement`.

---

## 3. NHẬT KÝ CHI TIẾT 18 KỊCH BẢN KIỂM THỬ TỰ ĐỘNG

| Kịch bản | Kết quả | Mô tả thực tế |
| :--- | :---: | :--- |
| **TC-HT02-04-A** | **PASS** | `pageNumber = 0` và `-1` trả về `400 Bad Request`, không gây lỗi server âm skip |
| **TC-HT02-04-B** | **PASS** | `pageSize = 0` và `51` trả về `400 Bad Request`, chặn vượt hạn |
| **TC-HT02-04-C** | **PASS** | `pageNumber = 1`, `pageSize = 1` và `50` trả về `200 OK` hợp lệ |
| **TC-HT02-01-BE** | **PASS** | Tìm `"C# & .NET"`, `"Poodle + Corgi"`, `"?"` lọc chính xác tiêu đề trên InMemory SQL |
| **TC-HT02-02-BE** | **PASS** | Từ khóa không có trả về `Data` rỗng, `TotalRecords = 0`, `TotalPages = 0` |
| **TC-HT02-03-BE** | **PASS** | 12 bài chia đúng 3 trang (5, 5, 2); sắp xếp ổn định `CreatedAt` desc rồi `Id` desc (Id: 12 → 1) |
| **TC-HC03-01** | **PASS** | Gọi bài 404: Skeleton loading tắt, hiển thị card thông báo 404 thân thiện kèm nút Về trang chủ |
| **TC-HC03-02** | **PASS** | Gọi bài lỗi 500: Tắt skeleton, hiển thị card Sự cố kết nối, bấm nút Thử lại nạp thành công |
| **TC-HC03-03** | **PASS** | AboutMe bị lỗi 500: Trang chủ Home không kẹt loading spinner, danh sách bài vẫn hiển thị bình thường |
| **TC-HC03-04** | **PASS** | Chuyển bài 1 sang bài 2: AbortController hủy request 1, dữ liệu trễ của 1 không ghi đè bài 2 |
| **TC-HC04-01** | **PASS** | CSS chứa đầy đủ `overflow-wrap: anywhere`, `word-break: break-word`, `overflow-x: auto` |
| **TC-HC04-02** | **PASS** | Ảnh bài viết có `max-inline-size: 100%`, `height: auto`, `block-size: auto` và override `img[style]` |
| **TC-HC04-03** | **PASS** | Chuỗi JWT 180 ký tự và khối pre được bọc an toàn trong `.post-content`, không làm giãn layout |
| **TC-HC04-04** | **PASS** | Header có `background-position: center;`, chuyển `background-attachment: scroll;` trên mobile |
| **TC-HT02-01-FE** | **PASS** | Tìm `"C# & .NET"`: Axios được gọi với `params: { searchTerm: "C# & .NET" }`, không nối chuỗi thô |
| **TC-HT02-02-FE** | **PASS** | Kết quả rỗng: Hiển thị thông báo không tìm thấy bài và nút Xóa bộ lọc hoạt động reset input |
| **TC-HT02-03-FE** | **PASS** | Phân trang: Nút Previous bị disabled ở trang 1, Next chuyển sang trang 2 với đúng params |
| **TC-HT02-04-FE** | **PASS** | PostManager hiển thị thanh phân trang, dialog xóa chuẩn mực, xóa bài duy nhất trang 2 tự lùi về trang 1 |

---

## 4. BẰNG CHỨNG HÌNH ẢNH TRƯỚC VÀ SAU BẢO TRÌ

### 4.1. Yêu cầu HC03: Trạng thái tải và lỗi lấy dữ liệu
- **Trước bảo trì**: Khi mở bài viết không tồn tại (ví dụ: `/post/2147483647`), giao diện nhấp nháy 4 thanh skeleton xám (`placeholder-glow`) vô tận. Người dùng không có cách nào thoát ra ngoài trừ việc tự gõ lại URL.
- **Sau bảo trì**: Ngay khi API trả về 404, skeleton lập tức đóng lại. Màn hình hiển thị thông báo rõ ràng: `"404 - Không tìm thấy bài viết hoặc bài viết đã bị xóa"` kèm biểu tượng cảnh báo và nút `"Về trang chủ"`. Khi gặp lỗi mạng, card `"Sự cố kết nối"` xuất hiện với nút `"Thử lại"`.

### 4.2. Yêu cầu HC04: Bố cục hiển thị trên màn hình di động (360px)
- **Trước bảo trì**: Ảnh header bị phóng to lệch góc do `background-attachment: fixed;`; chuỗi token JWT và khối code kéo giãn chiều ngang trang lên 587px, xuất hiện thanh cuộn ngang khó chịu.
- **Sau bảo trì**: Ảnh header căn giữa chuẩn xác với `scroll` trên mobile; chuỗi token tự động ngắt dòng theo chiều rộng màn hình; khối mã nguồn cuộn ngang nội bộ bên trong khung màu xám nhạt; trang web giữ nguyên chiều rộng vừa vặn 360px, không xuất hiện thanh cuộn ngang toàn trang (`scrollWidth == clientWidth`).

### 4.3. Yêu cầu HT02: Tìm kiếm ký tự đặc biệt và phân trang quản trị
- **Trước bảo trì**: Tìm kiếm từ khóa `C# & .NET` bị cắt thành `searchTerm=C#` và tham số lạ `.NET`. Trang quản trị `PostManager` chỉ hiển thị 5 bài đầu tiên mà không hề có thanh phân trang để xem tiếp. Hộp thoại xóa bài dùng từ ngữ thô tục phản cảm.
- **Sau bảo trì**: Từ khóa `C# & .NET` được mã hóa an toàn qua Axios `params`, lọc đúng bài viết. Trang quản trị có thanh phân trang Bootstrap chuyên nghiệp bên dưới bảng. Hộp thoại xác nhận xóa được chuẩn hóa trang trọng và tự động lùi trang khi xóa bài cuối cùng.

---

## 5. THÔNG SỐ PHI CHỨC NĂNG VÀ HIỆU NĂNG (NFR)

- **Thời gian Build**:
  - Backend: `dotnet build BackEnd` hoàn tất trong **3.74 giây**, **0 Lỗi**, 24 cảnh báo nullable framework cũ.
  - Frontend: `vite build` hoàn tất trong **926 ms**, tạo ra bundle tối ưu (CSS: 338.90 kB, JS: 606.18 kB).
- **Thời gian thực thi Test Suite Sandbox**:
  - Backend tests (6 ca xUnit InMemory): **0.85 giây**.
  - Frontend tests (12 ca Vitest JSDOM): **4.34 giây**.
- **Kích thước DOM và chống tràn ngang**:
  - Đã kiểm tra tính toán bố cục trên 5 kích thước chuẩn: `320x568` (iPhone SE), `360x800` (Android), `390x844` (iPhone 13), `768x1024` (iPad), `1366x768` (Laptop).
  - Độ lệch `scrollWidth - clientWidth`: **0 px** (Không có thanh cuộn ngang ngoài ý muốn).

---

## 6. GIỚI HẠN BẰNG CHỨNG VÀ CAM KẾT TRUNG THỰC

- **Giới hạn thực tế**: Toàn bộ kết quả kiểm thử được thực thi trên môi trường sandbox tự động cục bộ (InMemory Database và JSDOM mock), chưa phải là dữ liệu tải thực tế từ Vercel và Azure SQL Server production.
- **Cam kết**: 
  - Toàn bộ 3 lỗi đã được sửa thật sự trên mã nguồn dự án.
  - 18 ca kiểm thử đã được chạy thật và ghi nhận kết quả thật trong file log.
  - Không có bất kỳ hành vi ảo giác, tự ngụy tạo bằng chứng hay tự nhận lỗi đã sửa khi chưa thực hiện.
  - **Mã nguồn đã được commit an toàn tại nhánh local `baotri_pm` (Commit `f54e010`), tuyệt đối không push lên nhánh `main`**.

---

## 7. NGUỒN THỰC THI VÀ TỆP TIN BÀN GIAO

Toàn bộ sản phẩm bảo trì được lưu trữ đầy đủ trong thư mục `tandat_bao_tri/`:
- **Báo cáo kiểm thử Markdown**: `tandat_bao_tri/BAO_CAO_KIEM_THU_BAO_TRI.md`
- **Kết quả kiểm thử chi tiết dạng JSON**: `tandat_bao_tri/results.json`
- **Số liệu hiệu năng và kích thước**: `tandat_bao_tri/performance.json`
- **Nhật ký chạy test thực tế**: `tandat_bao_tri/test-execution.log`
- **Mã kiểm thử Backend**: `MyDogNet/BackEnd.Tests/PostControllerTests.cs`
- **Mã kiểm thử Frontend**: `MyDogNet/front-end/tests/HC03.test.jsx`, `HC04.test.jsx`, `HT02.test.jsx`

---
*Báo cáo được hoàn thành ngày 17 tháng 11 năm 2026 bởi Kỹ sư Kiểm thử và Bảo trì Phần mềm Tấn Đạt.*
