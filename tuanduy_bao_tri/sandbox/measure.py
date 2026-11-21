import concurrent.futures,json,time,urllib.request,pathlib,threading,os,subprocess
root=pathlib.Path('/home/duypy/Documents/Project 2/tuanduy_bao_tri')
def request(base,path,data=None,token=None):
 h={'Content-Type':'application/json'}
 if token:h['Authorization']='Bearer '+token
 req=urllib.request.Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers=h)
 with urllib.request.urlopen(req,timeout=15) as r:
  b=r.read().decode();return r.status,json.loads(b) if r.headers.get_content_type()=='application/json' else b
account={'userName':'maintadmin','password':'Sandbox9!_OnlyTesting'}
def process_for(name):
 target='/sandbox/baseline/BackEnd/bin/' if name=='before' else '/maintenance-tests/bin/'
 for line in subprocess.check_output(['ps','-eo','pid,args'],text=True).splitlines():
  parts=line.strip().split(None,1)
  if len(parts)==2 and parts[1].startswith('/') and target in parts[1]:return int(parts[0])
 raise RuntimeError('process not found')
def sample(pid):
 fields=pathlib.Path(f'/proc/{pid}/stat').read_text().split(') ',1)[1].split()
 ticks=int(fields[11])+int(fields[12]);status=pathlib.Path(f'/proc/{pid}/status').read_text()
 rss=int(next(x for x in status.splitlines() if x.startswith('VmRSS:')).split()[1])
 return ticks/os.sysconf('SC_CLK_TCK'),rss/1024
rows=[]
for name,base in [('before','http://localhost:5190'),('after','http://localhost:5191')]:
 _,token=request(base,'/Account/signIn',account)
 for i in range(10):request(base,'/Post')
 _,page=request(base,'/Post')
 target=30
 for i in range(max(0,target-page['totalRecords'])):request(base,'/Post',{'title':'Perf fixture '+str(i),'content':'<p>Performance fixture</p>','isPublished':True},token)
 # Same 20 remote image references, no calls to a real storage service in this workload.
 content='<p>Bài 20 ảnh</p>'+''.join('<img src="https://example.invalid/fixture.png">' for _ in range(20))
 times=[];codes=[]
 def read(i):
  start=time.perf_counter();status,_=request(base,'/Post');return (time.perf_counter()-start)*1000,status
 pid=process_for(name);cpu0,rss0=sample(pid);memory=[rss0];stop=threading.Event()
 def sampler():
  while not stop.wait(0.005):memory.append(sample(pid)[1])
 monitor=threading.Thread(target=sampler);monitor.start()
 start=time.perf_counter()
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  save=pool.submit(request,base,'/Post',{'title':'20 images perf','content':content,'isPublished':True},token)
  for ms,code in pool.map(read,range(50)):times.append(ms);codes.append(code)
  saved=save.result()[0]
 stop.set();monitor.join();cpu1,rss1=sample(pid);memory.append(rss1)
 ordered=sorted(times)
 rows.append({'environment':name,'samples':50,'get_concurrency_max':6,'save_status':saved,'http_codes':sorted(set(codes)),'p95_ms':round(ordered[47],2),'max_ms':round(max(times),2),'wall_seconds':round(time.perf_counter()-start,3),'cpu_process_ms':round((cpu1-cpu0)*1000,2),'peak_rss_mib':round(max(memory),2),'pid':pid})
print(json.dumps(rows,indent=2));(root/'performance.json').write_text(json.dumps(rows,indent=2))
