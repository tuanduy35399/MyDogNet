"""Tạo cấu hình và dữ liệu mẫu local, chỉ dùng thư viện chuẩn Python."""
import base64
import json
import os
from pathlib import Path
import secrets
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
API = "http://localhost:5091"


def write_private(path, text):
    # Không ghi đè cấu hình, mật khẩu hoặc kết nối người dùng đã chỉnh.
    try:
        with open(path, "x", encoding="utf-8", opener=lambda p, f: os.open(p, f, 0o600)) as f:
            f.write(text)
        print(f"Đã tạo {path.relative_to(ROOT)}")
    except FileExistsError:
        print(f"Giữ nguyên {path.relative_to(ROOT)}")


def init():
    config_path = ROOT / "BackEnd/appsettings.Local.json"
    compose_env = ROOT / ".env"
    # Tạo hai file cùng lúc để không vô tình sinh hai mật khẩu SQL khác nhau.
    if not config_path.exists() and not compose_env.exists():
        password = "Dg9!" + secrets.token_hex(18)
        config = json.loads((ROOT / "BackEnd/appsettings.Local.example.json").read_text())
        config["ConnectionStrings"]["DefaultConnection"] = (
            "Server=localhost,14333;Database=MyDogNetLocal;User Id=sa;"
            f"Password={password};Encrypt=True;TrustServerCertificate=True;"
        )
        config["JWT"]["SecretKey"] = secrets.token_urlsafe(48)
        write_private(config_path, json.dumps(config, ensure_ascii=False, indent=2) + "\n")
        write_private(compose_env, f"MSSQL_SA_PASSWORD={password}\n")
    elif config_path.exists() and compose_env.exists():
        print("Giữ nguyên cấu hình backend và Docker đã có.")
    else:
        sys.exit("Chỉ có một trong hai file BackEnd/appsettings.Local.json và .env. "
                 "Hãy tạo file còn thiếu theo .example và dùng cùng mật khẩu SQL; không tự ghi đè.")
    write_private(ROOT / "front-end/.env.local", "VITE_API_URL=http://localhost:5091\n")
    local_dir = ROOT / ".local"
    local_dir.mkdir(mode=0o700, exist_ok=True)
    account = {"userName": "localadmin", "password": "Dg9!" + secrets.token_hex(12)}
    write_private(local_dir / "dev-account.json", json.dumps(account, indent=2) + "\n")
    cloudinary = json.loads(config_path.read_text()).get("CloudinaryConfig", {})
    if all(cloudinary.get(key) for key in ("CloudName", "ApiKey", "ApiSecret")):
        print("Cấu hình xong. Cloudinary đã có đủ ba giá trị cấu hình.")
    else:
        print("Cấu hình xong. Điền ba giá trị Cloudinary trong JSON local nếu cần upload ảnh.")


def request(method, route, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(API + route, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            raw = response.read()
            if not raw:
                return None
            # Ok(string) của ASP.NET có thể trả token dưới dạng text/plain.
            if response.headers.get_content_type() == "application/json":
                return json.loads(raw)
            return raw.decode("utf-8")
    except urllib.error.HTTPError as error:
        sys.exit(f"API {route} trả HTTP {error.code}. Kiểm tra Swagger và log backend; không tạo thêm dữ liệu.")
    except urllib.error.URLError:
        sys.exit("Không gọi được backend local. Chạy migration và bật bash scripts/dev.sh backend trước.")


def seed():
    config = json.loads((ROOT / "BackEnd/appsettings.Local.json").read_text())
    connection = config["ConnectionStrings"]["DefaultConnection"].lower()
    if "server=localhost,14333;" not in connection or "database=mydognetlocal;" not in connection:
        sys.exit("Seed tự động chỉ dành cho MyDogNetLocal ở localhost:14333. Với DB khác, dùng Swagger tự nhập dữ liệu.")
    # Các biến môi trường ưu tiên hơn JSON; không seed nếu kết nối đã bị override.
    if os.environ.get("ConnectionStrings__DefaultConnection"):
        sys.exit("Đang override kết nối bằng biến môi trường; dùng Swagger để chủ động chọn dữ liệu.")
    if request("GET", "/AboutMe"):
        print("CSDL đã có hồ sơ. Giữ nguyên tài khoản/bài viết hiện tại, không seed lại.")
        return
    account = json.loads((ROOT / ".local/dev-account.json").read_text())
    request("POST", "/Account/signUp", {**account, "confirmPassword": account["password"]})
    token = request("POST", "/Account/signIn", account)
    payload = token.split(".")[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    user_id = claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]
    request("PATCH", "/Account/" + user_id, [
        {"op": "replace", "path": "/describe", "value": "Hồ sơ thử trên máy Linux."},
        {"op": "replace", "path": "/avatar", "value": "/dognet-logo.png"},
        {"op": "replace", "path": "/backGroundImg", "value": "/background.png"},
    ], token)
    request("POST", "/Post", {
        "title": "MyDogNet đã chạy trên Linux",
        "content": "<p>React → ASP.NET Core 6 → SQL Server local. Bạn có thể sửa hoặc xóa bài mẫu này.</p>",
        "thumbnail": "/background.png",
        "isPublished": True,
    }, token)
    print("Đã tạo hồ sơ localadmin và một bài mẫu. Mật khẩu xem trong .local/dev-account.json.")


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] in {"init", "seed"}:
        try:
            {"init": init, "seed": seed}[sys.argv[1]]()
        except (FileNotFoundError, KeyError, ValueError) as error:
            sys.exit(f"Thiếu hoặc sai cấu hình local ({type(error).__name__}). Chạy bash scripts/dev.sh init và kiểm tra các file mẫu.")
    else:
        sys.exit("Dùng: python3 scripts/local.py init|seed")
