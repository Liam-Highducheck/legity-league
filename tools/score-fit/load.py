import re, csv
from datetime import datetime, timedelta
from collections import defaultdict
rx = re.compile(r'startDate="([^"]+)" endDate="([^"]+)" value="HKCategoryValueSleepAnalysis(?:Asleep)?(\w+)"')
segs=[]
for line in open('/tmp/sleep_lines.txt'):
    m=rx.search(line)
    if m:
        f='%Y-%m-%d %H:%M:%S %z'
        segs.append((datetime.strptime(m[1],f),datetime.strptime(m[2],f),m[3]))
segs=sorted(set(segs),key=lambda x:(x[0],x[1]))
sessions=[];cur=[];ce=None
for s,e,v in segs:
    if cur and s-ce>timedelta(hours=3): sessions.append(cur);cur=[]
    cur.append((s,e,v)); ce=e if len(cur)==1 else max(ce,e)
sessions.append(cur)
A={'Core','Deep','REM','Unspecified'}
mins=lambda a,b:(b-a).total_seconds()/60
nights={}
for ses in sessions:
    asl=[x for x in ses if x[2] in A]
    if not asl: continue
    first=min(x[0] for x in asl); last=max(x[1] for x in asl)
    asleep=sum(mins(x[0],x[1]) for x in asl)
    d=last.strftime('%Y-%m-%d')
    if d in nights and nights[d]['asleep']>=asleep: continue
    aw=[(x[0],mins(x[0],x[1])) for x in ses if x[2]=='Awake' and x[0]>=first and x[1]<=last]
    nights[d]=dict(date=d,first=first,last=last,asleep=asleep,aw=aw,ses=ses)
rows=[r for r in csv.DictReader(open('/tmp/ll/filled.csv')) if r['duration_pts']]
for r in rows:
    for k in ['duration_pts','bedtime_pts','interruptions_pts','asleep_min']: r[k]=float(r[k])
