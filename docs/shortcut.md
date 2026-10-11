# Apple Shortcut: push sleep to Legity League

The Shortcut stays deliberately dumb: it collects the last few days of **Sleep Analysis** samples
from Apple Health and POSTs them as-is. Postgres (`ingest_sleep_segments`) merges overlapping
sources, splits sessions, assigns each night to your local wake-up date and works out duration,
deep, REM and restorative time.

Build it once, share it with an iCloud link, then put the link in `web/.env.production` as
`VITE_SHORTCUT_URL`. Shortcuts' UI shifts between iOS versions, so treat the action names below as a guide.

## Actions

1. **Text** — your key. Mark this action as an **Import Question** ("Paste your Legity key") so
   everyone who adds the Shortcut is asked for it once. Name the output `Key`.
2. **Find Health Samples**
   - Type: **Sleep Analysis**
   - Start Date **is in the last** `3` **days**
   - Sort by **Start Date**, oldest first. No limit.
3. **Repeat with Each** item from step 2:
   - **Dictionary**
     - `start` → *Format Date* (Repeat Item → Start Date, format **ISO 8601**)
     - `end` → *Format Date* (Repeat Item → End Date, format **ISO 8601**)
     - `value` → Repeat Item → **Value** (text such as Core, Deep, REM, Awake, In Bed, Asleep)
   - **Add to Variable** `segments`
4. **Get Contents of URL**
   - URL: `https://hupmixkoosuyljzpjpjg.supabase.co/rest/v1/rpc/ingest_sleep_segments`
   - Method: **POST**
   - Headers: `apikey` = the project anon key (shown in the app under Advanced), `Content-Type` = `application/json`
   - Request Body: **JSON**
     - `p_token` (Text) → `Key`
     - `p_segments` (List) → `segments`
5. *(optional)* **Show Notification** with the result so a manual run confirms success.

ISO 8601 matters: it includes your UTC offset, which is how the server gets the right local date.

## Automation (each person does this by hand — it can't be shared)

Shortcuts → Automation → **+** → **Time of Day** → 8:00 AM, Daily → **Run Shortcut** →
turn on **Run Immediately**, turn off **Notify When Run**.

## Testing the endpoint without a phone

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/ingest_sleep_segments" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"p_token":"ll_...","p_segments":[{"start":"2026-10-10T23:10:00+11:00","end":"2026-10-11T06:50:00+11:00","value":"Asleep"}]}'
```

It returns `{"nights":[{"night_date":"2026-10-11","duration_min":460}]}`.

## Rules the server applies

- Overlapping segments (Watch + iPhone) are merged — never double counted.
- A gap longer than 3 hours starts a new session; sessions under 2 hours (naps) are ignored.
- Each session belongs to the local date it **ended** on; the longest session per date wins.
- Re-sending data is safe. A night is only overwritten if the new duration is ≥ the stored one,
  so a truncated window can't clobber a complete night.
