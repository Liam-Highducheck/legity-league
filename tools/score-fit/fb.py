exec(open('/tmp/ll/load.py').read())
import statistics as st
from datetime import date, timedelta
from zoneinfo import ZoneInfo
D=lambda s:date.fromisoformat(s)
def clock(dt,tz):
    dt=dt.astimezone(ZoneInfo(tz)); return ((dt.hour*60+dt.minute+dt.second/60-720)%1440)
dates=sorted(nights); idx={d:i for i,d in enumerate(dates)}
ons={d:clock(nights[d]['first'],nights[d]['tz']) for d in dates}
