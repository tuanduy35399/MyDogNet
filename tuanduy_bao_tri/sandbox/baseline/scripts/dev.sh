#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

find_dotnet() {
  if [[ -x "$HOME/.dotnet/dotnet" ]]; then
    export DOTNET_ROOT="$HOME/.dotnet"
    export PATH="$DOTNET_ROOT:$DOTNET_ROOT/tools:$PATH"
  fi
  if ! command -v dotnet >/dev/null; then
    echo 'Chưa có .NET SDK. Chạy: bash scripts/dev.sh install-dotnet' >&2
    exit 1
  fi
}

require_config() {
  if [[ ! -f BackEnd/appsettings.Local.json ]]; then
    echo 'Chạy bash scripts/dev.sh init để tạo cấu hình local trước.' >&2
    exit 1
  fi
}

case "${1:-help}" in
  install-dotnet)
    install_script="$(mktemp)"
    trap 'rm -f "$install_script"' EXIT
    curl -fsSL https://dot.net/v1/dotnet-install.sh -o "$install_script"
    bash "$install_script" --version 6.0.428 --install-dir "$HOME/.dotnet" --no-path
    echo 'Đã cài SDK vào ~/.dotnet. Các lệnh dev.sh tự tìm đường dẫn này.'
    ;;
  init)
    python3 scripts/local.py init
    ;;
  restore)
    find_dotnet
    dotnet restore BackEnd/BackEnd.csproj
    dotnet tool restore
    (cd front-end && npm ci)
    ;;
  build)
    find_dotnet
    dotnet build BackEnd/BackEnd.csproj --nologo
    ;;
  db-up)
    require_config
    if ! docker info >/dev/null 2>&1; then
      echo 'Docker chưa chạy hoặc tài khoản chưa có quyền. Tại thư mục MyDogNet, chạy:' >&2
      printf 'sudo docker compose --project-directory %q up -d --wait db\n' "$project_dir" >&2
      exit 1
    fi
    docker compose up -d --wait db
    ;;
  migrate)
    require_config
    find_dotnet
    export ASPNETCORE_ENVIRONMENT=Development
    dotnet tool restore
    cd BackEnd
    dotnet ef database update --project BackEnd.csproj
    ;;
  backend)
    require_config
    find_dotnet
    exec dotnet run --project BackEnd/BackEnd.csproj --launch-profile Linux
    ;;
  frontend)
    if [[ ! -f front-end/.env.local ]]; then
      echo 'Chạy bash scripts/dev.sh init để tạo front-end/.env.local.' >&2
      exit 1
    fi
    cd front-end
    exec npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
    ;;
  seed)
    python3 scripts/local.py seed
    ;;
  *)
    echo 'MyDogNet Linux / VS Code'
    echo '  bash scripts/dev.sh install-dotnet  # Cài SDK 6.0.428 vào ~/.dotnet'
    echo '  bash scripts/dev.sh init            # Sinh cấu hình local, không ghi đè file có sẵn'
    echo '  bash scripts/dev.sh restore         # Cài thư viện BE, EF CLI và FE'
    echo '  bash scripts/dev.sh db-up           # Bật SQL Server bằng Docker'
    echo '  bash scripts/dev.sh migrate         # Tạo/cập nhật các bảng từ migration có sẵn'
    echo '  bash scripts/dev.sh backend         # http://localhost:5091/swagger'
    echo '  bash scripts/dev.sh seed            # Tạo hồ sơ và một bài mẫu trên DB local mới'
    echo '  bash scripts/dev.sh frontend        # http://localhost:5173'
    ;;
esac
