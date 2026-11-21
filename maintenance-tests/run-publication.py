#!/usr/bin/env python3
"""HT01/HT03 integration checks: local SQL database, FakeCloud and optional UI host."""
import argparse, datetime, json, os, re, secrets, shutil, subprocess, sys
from pathlib import Path

args=argparse.ArgumentParser()
args.add_argument('--baseline',action='store_true',help='Use the captured pre-maintenance source under .local')
args.add_argument('--serve',action='store_true',help='Start an isolated API host for browser checks')
args.add_argument('--output',type=Path)
options=args.parse_args()
root=Path(__file__).resolve().parents[1]
product=root/'.local/maintenance/ht01_ht03/baseline' if options.baseline else root
if not (product/'BackEnd/BackEnd.csproj').exists():sys.exit('Chưa có snapshot baseline. Xem hướng dẫn kiểm thử HT01/HT03.')
config=json.loads((root/'BackEnd/appsettings.Local.json').read_text())
connection=config['ConnectionStrings']['DefaultConnection']
if not re.search(r'(?:^|;)\s*(?:Server|Data Source)\s*=\s*(?:localhost|127\.0\.0\.1),\d+\s*(?:;|$)',connection,re.I):sys.exit('Chỉ chạy với SQL Server local.')
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S%f')
mode='HTBefore' if options.baseline else 'HTAfter'
database='MyDogNetMaintenanceAfter_'+mode+'_'+stamp
connection,n=re.subn(r'(?i)((?:^|;)\s*(?:Database|Initial Catalog)\s*=)[^;]*',lambda m:m[1]+database,connection,count=1)
if n!=1:sys.exit('Thiếu tên Database trong cấu hình local.')
output=(options.output or root/'.local/maintenance/ht01_ht03/runs'/stamp).resolve();output.mkdir(parents=True,exist_ok=True)
private=root/'.local/maintenance/ht01_ht03';private.mkdir(parents=True,exist_ok=True)
env=os.environ.copy();env.update({
 'ConnectionStrings__DefaultConnection':connection,'JWT__SecretKey':secrets.token_urlsafe(48),'JWT__ValidIssuer':'maintenance-test','JWT__ValidAudience':'Admin',
 'ASPNETCORE_ENVIRONMENT':'Testing','MediaCleanup__Enabled':'false','MediaCleanup__AllowDelete':'false','MAINTENANCE_OUTPUT':str(output),
 'MAINTENANCE_BASELINE_DI':'true' if options.baseline else 'false','MAINTENANCE_PORT':'5190' if options.baseline else '5191','Cors__AllowedOrigins__0':'http://localhost:5174','Cors__AllowedOrigins__1':'http://localhost:5175','Logging__LogLevel__Default':'Warning',
})
# Only private ignored storage receives credentials. Reports receive DB names and results.
secretfile=private/(mode+'-env.json');secretfile.write_text(json.dumps({k:v for k,v in env.items() if k in ['PATH','HOME','DOTNET_ROOT'] or '__' in k or k in ['MAINTENANCE_OUTPUT','ASPNETCORE_ENVIRONMENT','MAINTENANCE_PORT']}));secretfile.chmod(0o600)
(output/'environment.json').write_text(json.dumps({'database':database,'sql':'localhost:14333','cloud':'FakeCloud','source':'ca6d164' if options.baseline else 'working tree','mode':'serve' if options.serve else 'integration'},indent=2))
dotnet=shutil.which('dotnet') or str(Path.home()/'.dotnet/dotnet')
command=[dotnet,'run','--project','maintenance-tests/MaintenanceTests.csproj','--']
command+=['serve-publication' if options.serve else 'publication-baseline' if options.baseline else 'publication']
print('CSDL thử:',database,flush=True);print('Kết quả:',output,flush=True)
if options.serve:
 os.chdir(product);os.execve(dotnet,command,env)
with (output/'execution.log').open('w') as log:result=subprocess.run(command,cwd=product,env=env,stdout=log,stderr=subprocess.STDOUT)
if result.returncode:
 print('Chạy chưa thành công. Xem execution.log.',flush=True);sys.exit(result.returncode)
if not options.baseline:
 checks=json.loads((output/'results.json').read_text());print(f"{sum(x['status']=='PASS' for x in checks)}/{len(checks)} kịch bản đạt.")
else:print('Đã ghi kết quả quan sát trước bảo trì.')
