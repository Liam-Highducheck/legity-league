exec(open('/tmp/ll/load.py').read())
import statistics as st, itertools
from zoneinfo import ZoneInfo
SY=ZoneInfo('Australia/Sydney')
def clock(dt):
    dt=dt.astimezone(SY); return ((dt.hour*60+dt.minute+dt.second/60-720)%1440)
dates=sorted(nights); ons={d:clock(nights[d]['first']) for d in dates}
idx={d:i for i,d in enumerate(dates)}
# exclude odd nights (nap-only 09-11) from baselines? keep option
def run(k,n,fn,L,s,E=60,es=1/30,skip=()):
    err=0;cnt=0
    for r in rows:
        d=r['wake_date']; i=idx[d]
        prior=[ons[x] for x in dates[max(0,i-k-n):max(0,i-k)] if x not in skip]
        if len(prior)<3: continue
        delta=ons[d]-fn(prior)
        loss=min(30,max(0,(delta-L)*s)) if delta>0 else min(6,max(0,(-delta-E)*es))
        err+=abs(loss-(30-r['bedtime_pts'])); cnt+=1
    return err/cnt
best=[]
for k in range(0,6):
  for n in [5,7,10,13,14,20,30]:
    for nm,fn in [('mean',st.mean),('median',st.median)]:
      for L in [0,5,10,15,20,30]:
        for s in [0.15,0.2,0.222,0.25,0.3,0.333]:
          best.append((run(k,n,fn,L,s,skip=('2026-09-11',)),k,n,nm,L,s))
best.sort()
for b in best[:12]: print([round(x,3) if isinstance(x,float) else x for x in b])
print()
res=[]
for r in rows:
    d=r['wake_date']; i=idx[d]
    prior=[ons[x] for x in dates[max(0,i-13):i]]
    delta=ons[d]-st.mean(prior)
    loss=min(30,max(0,(delta-15)*0.222)) if delta>0 else min(6,max(0,(-delta-60)/30))
    res.append((abs(loss-(30-r['bedtime_pts'])),d,r['onset'],round(delta),round(loss,1),30-r['bedtime_pts']))
for x in sorted(res,reverse=True)[:16]: print(x)
print('\nlate scatter (mean13 delta, loss), excluding Oct>=4')
pts=[]
for r in rows:
    d=r['wake_date']
    if d>='2026-10-04' or d=='2026-09-11': continue
    i=idx[d]; prior=[ons[x] for x in dates[max(0,i-13):i]]
    delta=ons[d]-st.mean(prior); pts.append((round(delta),30-r['bedtime_pts'],d))
for p in sorted(pts):
    if p[0]>10: print(p)
