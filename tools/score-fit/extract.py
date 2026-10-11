import re, csv, sys
from datetime import datetime, timedelta
from collections import defaultdict
rx = re.compile(r'startDate="([^"]+)" endDate="([^"]+)" value="HKCategoryValueSleepAnalysis(?:Asleep)?(\w+)"')
segs=[]
for line in open('/tmp/sleep_lines.txt'):
    m=rx.search(line)
    if not m: continue
    s=datetime.strptime(m[1],'%Y-%m-%d %H:%M:%S %z'); e=datetime.strptime(m[2],'%Y-%m-%d %H:%M:%S %z')
    segs.append((s,e,m[3]))
segs.sort(key=lambda x:(x[0],x[1]))
# dedupe identical
segs=list(dict.fromkeys(segs))
# sessions: gap > 3h between consecutive segment ends/starts
sessions=[]; cur=[]; cur_end=None
for s,e,v in segs:
    if cur and s-cur_end>timedelta(hours=3):
        sessions.append(cur); cur=[]
    cur.append((s,e,v)); cur_end=max(cur_end,e) if cur_end and len(cur)>1 else e
sessions.append(cur)
ASLEEP={'Core','Deep','REM','Unspecified'}
mins=lambda a,b:(b-a).total_seconds()/60
rows=[]
for ses in sessions:
    asl=[x for x in ses if x[2] in ASLEEP]
    if not asl: continue
    first=min(x[0] for x in asl); last=max(x[1] for x in asl)
    inside=[x for x in ses if x[2]=='Awake' and x[0]>=first and x[1]<=last]
    tot=lambda k:sum(mins(x[0],x[1]) for x in ses if x[2]==k)
    asleep=sum(mins(x[0],x[1]) for x in asl)
    aw=[mins(x[0],x[1]) for x in inside]
    rows.append(dict(
        wake_date=last.strftime('%Y-%m-%d'), onset=first.strftime('%H:%M'), wake=last.strftime('%H:%M'),
        asleep_min=round(asleep), in_bed_min=round(mins(first,last)),
        core_min=round(tot('Core')), deep_min=round(tot('Deep')), rem_min=round(tot('REM')), unspecified_min=round(tot('Unspecified')),
        awake_min=round(sum(aw),1), awake_segments=len(aw), awake_ge2min=sum(1 for a in aw if a>=2), awake_ge5min=sum(1 for a in aw if a>=5),
        onset_iso=first.isoformat(), wake_iso=last.isoformat(), _asleep=asleep))
# per wake_date keep longest session; others listed as naps
by=defaultdict(list)
for r in rows: by[r['wake_date']].append(r)
out=[]
for d,rs in by.items():
    rs.sort(key=lambda r:-r['_asleep'])
    main=rs[0]; main['other_sessions']='; '.join(f"{r['onset']}-{r['wake']} {r['asleep_min']}m" for r in rs[1:])
    if main['asleep_min']>=120: out.append(main)
out.sort(key=lambda r:r['wake_date'],reverse=True)
cols=['wake_date','onset','wake','asleep_min','in_bed_min','core_min','deep_min','rem_min','unspecified_min','awake_min','awake_segments','awake_ge2min','awake_ge5min','other_sessions','onset_iso','wake_iso']
with open('/Users/liam/Downloads/apple_health_export/sleep_nights.csv','w',newline='') as f:
    w=csv.writer(f); w.writerow(cols+['apple_score','duration_pts','bedtime_pts','interruptions_pts'])
    for r in out: w.writerow([r.get(c,'') for c in cols]+['','','',''])
print(len(out),'nights', out[-1]['wake_date'],'..',out[0]['wake_date'])
