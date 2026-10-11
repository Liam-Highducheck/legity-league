exec(open('/tmp/ll/load.py').read())
import itertools
data=[]
for r in rows:
    if r['wake_date']=='2026-09-11': continue
    L=[m for _,m in nights[r['wake_date']]['aw']]
    data.append((L,r['interruptions_pts']))
best=[]
for th in [0,0.5,1]:
 for c0 in [2,2.5,3,3.5]:
  for a in [0.5,0.6,0.7,0.8,0.9,1.0,1.1,1.25]:
   for t0 in [0,2,4,6,8,11]:
    for b in [0.05,0.08,0.1,0.12,0.15,0.2]:
      ok=0;err=0
      for L,pts in data:
        big=[x for x in L if x>=th]
        p=max(0,20-a*max(0,len(big)-c0)-b*max(0,sum(L)-t0))
        err+=abs(round(p)-pts); ok+= round(p)==pts
      best.append((err/len(data),ok/len(data),th,c0,a,t0,b))
best.sort()
for b in best[:8]: print([round(x,3) for x in b])
