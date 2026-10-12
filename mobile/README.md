# Legity League native spike

Throwaway app that proves: read sleep from HealthKit, send it to the existing `ingest_sleep_segments` RPC.
It needs a **development build** (not Expo Go) because HealthKit is native code.

## Run on your iPhone (free Apple ID is enough for the spike)

1. `sudo xcodebuild -license accept` and `brew install cocoapods` (one-time).
2. `cp .env.example .env` and fill in the public URL + anon key (same values as `web/.env.development`).
3. Plug in the iPhone (Developer Mode on: Settings > Privacy & Security), then `npx expo run:ios --device`.
   First run opens signing: in Xcode set Team to your Personal Team for the `LegityLeague` target.
4. In the app: paste your ingest token (from the web app), tap **Read sleep**, then **Send**.

Background delivery is off (`"background": false` in `app.json`) because free teams may not sign that entitlement.
Turn it on after the paid account is active.
