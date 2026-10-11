exec(open('/tmp/ll/load.py').read())
import itertools, math
data=[]
for r in rows:
    if r['wake_date']=='2026-09-11': continue
    L=[m for _,m in nights[r['wake_date']]['aw']]
    data.append((L,r['interruptions_pts'],r['wake_date']))
best=[]
for tb in [1.0]:                 # blip threshold: segments < tb are "blips"
 for a in [0.7,0.8,0.9,1.0,1.1]:
  for a2 in [0.9,1.0,1.1,1.2,1.4]:       # extra for long (>=5) segments
   for bl in [0,0.1,0.2,0.3]:
    for c in [0.5,1.0,1.25,1.5,1.75,2.0,2.5]:
     for m0 in [0,10,15,20,30]:
      for bm in [0,0.05,0.1]:
        ex=0;er=0
        for L,pts,d in data:
            n1=sum(1 for x in L if tb<=x<5); n2=sum(1 for x in L if x>=5); nb=sum(1 for x in L if x<tb)
            loss=a*n1+a2*n2+bl*nb-c+bm*max(0,sum(L)-m0)
            p=20-min(20,max(0,loss)); q=round(p); ex+=q==pts; er+=abs(q-pts)
        best.append((er/len(data),ex/len(data),a,a2,bl,c,m0,bm))
best.sort(key=lambda x:(x[0],-x[1]))
for b in best[:8]: print([round(x,3) for x in b])
