import argparse, urllib.request, urllib.error, urllib.parse, json
from pathlib import Path
parser=argparse.ArgumentParser(description='Check the localhost:5175 sandbox proxy only')
parser.add_argument('--output',type=Path,required=True)
root=parser.parse_args().output.resolve();root.mkdir(parents=True,exist_ok=True)
def call(path, method='GET', body=None, token=None, conditional=False):
 headers={'Content-Type':'application/json-patch+json' if method=='PATCH' else 'application/json'}
 if token:headers['Authorization']='Bearer '+token
 if conditional:headers.update({'If-None-Match':'"cached-test"','If-Modified-Since':'Sat, 21 Nov 2026 00:00:00 GMT'})
 req=urllib.request.Request('http://localhost:5175/api'+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
 try:r=urllib.request.urlopen(req,timeout=20)
 except urllib.error.HTTPError as e:r=e
 b=r.read().decode()
 try:value=json.loads(b) if b else None
 except json.JSONDecodeError:value=b
 return r.status,{k.lower():v for k,v in r.headers.items()},value
status,_,token=call('/Account/signin','POST',{'userName':'editorA','password':'Sandbox9!_OnlyTesting'})
assert status==200 and isinstance(token,str), 'Sandbox sign-in failed'
status,_,created=call('/Post','POST',{'title':'Kiểm tra thu hồi qua proxy','content':'<p>Fixture proxy</p>','isPublished':True},token)
assert status==200 and isinstance(created,dict), 'Sandbox create failed'
id=created['id']; rows=[]
s,h,_=call('/Post/'+str(id)); rows.append({'id':'PROXY-HT01-PUBLIC','status':'PASS' if s==200 and 'no-store' in h.get('cache-control','') else 'FAIL','http':s,'cacheControl':h.get('cache-control')})
_,_,_=call('/Post/'+str(id),'PATCH',[{'op':'replace','path':'/isPublished','value':False}],token)
s,h,_=call('/Post/'+str(id),conditional=True); rows.append({'id':'PROXY-HT01-WITHDRAW','status':'PASS' if s==404 and 'no-store' in h.get('cache-control','') else 'FAIL','http':s,'cacheControl':h.get('cache-control')})
s,h,b=call('/Post?searchTerm='+urllib.parse.quote('Kiểm tra thu hồi qua proxy'));rows.append({'id':'PROXY-HT01-LIST','status':'PASS' if s==200 and b['totalRecords']==0 and 'no-store' in h.get('cache-control','') else 'FAIL','http':s,'total':b['totalRecords'],'cacheControl':h.get('cache-control')})
(root/'proxy-results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print(json.dumps(rows,ensure_ascii=False))

assert all(row["status"]=="PASS" for row in rows), "Proxy check failed"
