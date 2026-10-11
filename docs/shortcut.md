# Apple Shortcut: push sleep to Legity League

The Shortcut stays deliberately dumb: it collects the last few days of **Sleep Analysis** samples
from Apple Health and POSTs them as-is. Postgres (`ingest_sleep_segments`) merges overlapping
sources, splits sessions, assigns each night to your local wake-up date and works out duration,
deep, REM and restorative time. Every call is logged to `ingest_events` with the trigger label it
received, which is how we compare automation triggers (see "Sync history" in the app).

Name the shortcut exactly **Legity Sync**; the app runs it by that name.

## Build it once (on an iPhone: Health actions don't exist on Mac)

1. **Text** — `YOUR_KEY_HERE` (this is where each person's key goes).
2. **Find Health Samples**
   - Type: **Sleep Analysis**
   - Start Date **is in the last** `7` **days** (the regular sync window)
   - Sort by **Start Date**, oldest first. No limit.
3. **Repeat with Each** item from step 2, containing, in order:
   - **Format Date** — input *Repeat Item → Start Date*; Date Format **ISO 8601**, **Include ISO 8601 Time** on.
   - **Format Date** — input *Repeat Item → End Date*; same settings.
   - **Get Text from Input** — input *Repeat Item → Value* (Core, Deep, REM, Awake, In Bed, Asleep…).
   - **Dictionary** — `start` = first Formatted Date, `end` = second Formatted Date, `value` = the Text from the previous step.
   The loop's own **Repeat Results** collects one dictionary per sample, so no "Add to Variable" is needed.
4. **Get Contents of URL**
   - URL: `https://hupmixkoosuyljzpjpjg.supabase.co/rest/v1/rpc/ingest_sleep_segments`
   - Method: **POST**
   - Headers: `apikey` = the project anon key (shown in the app under Advanced), `Content-Type` = `application/json`
   - Request Body: **JSON**
     - `p_token` (Text) → the Text from step 1
     - `p_segments` (**Text** type, not Array) → **Repeat Results**. Shortcuts sends this as JSON Lines
       (one `{"start":…,"end":…,"value":…}` object per line); the server accepts that, a JSON array, or `start|end|value` lines.
     - `p_trigger` (Text) → **Shortcut Input** (the app and automations pass a label like `time` or `open-app`)
5. **Show Notification** — *Contents of URL*. Handy while we test triggers. Don't leave a **Show Result** in:
   it opens a dialog that blocks unattended runs.

ISO 8601 matters: it includes your UTC offset, which is how the server gets the right local date.

## iPhone settings every user needs

- **Settings → Shortcuts → Advanced → Allow Sharing Large Amounts of Data**: on. Otherwise iOS refuses to send the Health items
  ("This action is trying to share 104 Health items, which is not allowed").
- On the first run choose **Always Allow** when it asks to send health samples to our server, or automations will keep prompting.
- Sleep only appears in Shortcuts' Health permissions once a Find Health Samples action asks for it (the default type is Steps).

## Make it installable (the one-tap flow)

1. Open the shortcut's **(i)** details → **Setup** → **Add Import Question** for the Text action
   (step 1). Question: `Paste your Legity key`.
2. **Before sharing, make sure the Text action contains `YOUR_KEY_HERE`, not your real key.**
   A shared shortcut carries whatever value is in it.
3. Share → **Copy iCloud Link**, and put that link in `web/.env.production` as `VITE_SHORTCUT_URL`.

The app then copies the person's key to the clipboard when they tap **Add to Shortcuts**; Shortcuts
asks the import question, they paste, tap Add.

## Triggers we're testing

Automations can't be created or shared by link, so each is set up by hand (the app shows the steps).
Each automation uses two actions: **Text** (the label) → **Run Shortcut** `Legity Sync` with that Text as input.

| Label | Trigger |
| --- | --- |
| `time` | Time of Day, e.g. 8:00 AM |
| `open-app` | App → pick native apps you open daily (Messages, Safari…) → Is Opened. **Tested: works, phone is unlocked.** Home Screen web apps (Legity League) are not offered as a trigger. |
| `wake-up` | Sleep → Waking Up (built, untested until a real morning) |
| `alarm` | Alarm → Is Stopped → Any (built, untested until a real alarm) |
| `app-button` | "Sync now" button in the app (`shortcuts://run-shortcut`) |

Health data is protected while the phone is locked, so time-based triggers may fail. Sync history shows which ones actually fire.

## Testing the endpoint without a phone

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/ingest_sleep_segments" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"p_token":"ll_...","p_trigger":"curl","p_segments":[{"start":"2026-10-10T23:10:00+11:00","end":"2026-10-11T06:50:00+11:00","value":"Asleep"}]}'
```

It returns `{"nights":[{"night_date":"2026-10-11","duration_min":460}]}`.

## Rules the server applies

- Overlapping segments (Watch + iPhone) are merged — never double counted.
- A gap longer than 3 hours starts a new session; sessions under 2 hours (naps) are ignored.
- Each session belongs to the local date it **ended** on; the longest session per date wins.
- Re-sending data is safe. A night is only overwritten if the new duration is ≥ the stored one,
  so a truncated window can't clobber a complete night.

## Findings so far

- There is no "when the phone is unlocked" trigger in iOS Shortcuts.
- Home Screen web apps cannot be chosen in the App trigger, so the nearest equivalent is triggering on a few native apps you open every day.
- App trigger with **Run Immediately**: confirmed working, no prompts (Sync history shows `open-app`).
- **Time of Day with the phone locked: did not sync.** A 3:34pm automation (Run Immediately) left a locked phone produced no entry at all in Sync history. The same automation at 3:44pm with the phone awake synced normally (104 segments, 4 nights). So locked phones can't read Health, as feared. Wake-up and alarm triggers may hit the same wall; test on a real morning.
- A shortcut needs **Always Allow** (send health samples) once per install, and permission does not carry over to a re-installed copy.
- Remove the **Show Notification** action from the shared shortcut once triggers are settled; it posts a banner on every automatic run.

## Backfill (catching up on missed nights)

The regular **Legity Sync** reaches back 7 days. To recover older nights, there is a second published shortcut,
**Legity Backfill**: an exact copy of Legity Sync except **Start Date is in the last `14` days**. It uses the same
endpoint, so re-sent nights are safe (a night is only overwritten when the new duration is ≥ the stored one).

- Published separately (`VITE_BACKFILL_SHORTCUT_URL`) and installed the same way: copy key, paste at the import question.
- The app shows **Sync coverage** (last 30 nights) under Me → Devices, and a catch-up prompt on Today when the last
  synced night is more than 5 days old. Both offer **Run Backfill** (`shortcuts://run-shortcut?name=Legity%20Backfill`).
- Republishing either shortcut: reset the Text action to `YOUR_KEY_HERE`, share, verify the downloaded plist has no `ll_…`
  key and no notification action, then restore your key.

### Why 14 days, not 60

A 60-day Backfill ran for 20+ minutes without finishing and was killed when the phone locked ("Shortcuts was
interrupted"). The per-sample loop (two Format Date actions, Get Text, Dictionary) is slow and gets slower as the list
grows. 14 days (about 500 samples) finished in under a minute. Reaching further back would need the window split into
chunks (several shorter runs), which isn't built. Keep the phone awake while a backfill runs: a lock kills it.

## Which device a night came from

The Shortcut sends only `start`, `end` and `value`, so ingest can't see the source device. It labels each night
`sleep_nights.device_class` from the data itself: any Core/Deep/REM segment means `watch` (an Apple Watch, or another
wearable writing stages to Health), otherwise `phone`. A true split would need the Shortcut to send each sample's
source name; whether Shortcuts exposes it (Get Details of Health Samples) hasn't been checked on a device.
