#!/usr/bin/env python3
"""Run maintenance checks against a fresh local test database and FakeCloud."""
import datetime
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
config = json.loads((root / 'BackEnd/appsettings.Local.json').read_text())
connection = config['ConnectionStrings']['DefaultConnection']
if not re.search(r'(?:^|;)\s*(?:Server|Data Source)\s*=\s*(?:localhost|127\.0\.0\.1),\d+\s*(?:;|$)', connection, re.I):
    sys.exit('Chỉ chạy với SQL Server local; kiểm tra appsettings.Local.json.')
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S%f')
database = 'MyDogNetMaintenanceAfter_' + stamp
connection, count = re.subn(r'(?i)((?:^|;)\s*(?:Database|Initial Catalog)\s*=)[^;]*', lambda m: m[1] + database, connection, count=1)
if count != 1:
    sys.exit('Không tìm thấy tên CSDL trong cấu hình local.')
output = root / '.local/maintenance/runs' / stamp
output.mkdir(parents=True, mode=0o700)
env = os.environ.copy()
env.update({
    'ConnectionStrings__DefaultConnection': connection,
    'JWT__SecretKey': secrets.token_urlsafe(48),
    'JWT__ValidIssuer': 'maintenance-test',
    'JWT__ValidAudience': 'Admin',
    'ASPNETCORE_ENVIRONMENT': 'Testing',
    'MediaCleanup__AllowDelete': 'true',
    'MediaCleanup__Enabled': 'false',
    'MAINTENANCE_OUTPUT': str(output),
    'Logging__LogLevel__Default': 'Warning',
})
dotnet = shutil.which('dotnet') or str(Path.home() / '.dotnet/dotnet')
print('CSDL kiểm thử riêng:', database, flush=True)
print('Kết quả:', output, flush=True)
with (output / 'execution.log').open('w') as log:
    result = subprocess.run([dotnet, 'run', '--project', 'maintenance-tests/MaintenanceTests.csproj'], cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT)
if result.returncode:
    sys.exit(f'Chạy chưa thành công; xem {output / "execution.log"}.')
checks = json.loads((output / 'results.json').read_text())
passed = sum(x['status'] == 'PASS' for x in checks)
print(f'{passed}/{len(checks)} kịch bản đạt. SQL thật, kho ảnh giả lập; không gọi Cloudinary thật.')
sys.exit(0 if len(checks) == 27 and passed == len(checks) else 1)
