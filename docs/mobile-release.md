# Releasing the native app

The app lives in `mobile/` (Expo, iOS first). Builds and uploads run on Expo's servers (EAS), so no Xcode archive is
needed. EAS project: `@liam-highducheck/legity-league` (ID in `mobile/app.json`).

Bundle ID `com.legityleague.app` · channels `development`, `preview`, `production` (`mobile/eas.json`).

## One-time setup (needs the Apple ID owner, interactive)

Run these from `mobile/`. They ask for the Apple ID and a 2FA code, which only the account holder can give.

```bash
npx eas-cli build --platform ios --profile production
```

EAS then logs in to Apple, registers the bundle ID with the HealthKit capability (including background delivery), creates
the distribution certificate and provisioning profile, and builds. Say yes when it offers to manage credentials.

Create the app record in App Store Connect (appstoreconnect.apple.com → Apps → +): name *Legity League*, bundle ID
`com.legityleague.app`, any SKU. Then upload the build:

```bash
npx eas-cli submit --platform ios --profile production
```

If it asks for the App Store Connect app ID, it's the number in the app's URL; put it in `eas.json` under
`submit.production.ios.ascAppId` so later submits don't ask.

### TestFlight

After Apple finishes processing (about 10 minutes), the build appears under the app's TestFlight tab.

- **Internal testers** (up to 100, no review): App Store Connect → Users and Access → add each person → add them to the
  internal group. They install from the TestFlight app.
- **External testers** (anyone with an email or a public link): create a group, add the build. The first build of each
  version goes through a short Beta App Review.
- Fill in *Test Information* (what to test, a demo account or invite code, contact email). Reviewers can't join without one.

## Every release after that

| Change | What to do |
|---|---|
| JavaScript or UI only | `npx eas-cli update --channel production --message "what changed"`. Installed apps pick it up on next launch, no review. |
| New native library, permission or entitlement | Bump `version` in `mobile/app.json`, then `eas build --profile production` and `eas submit`. Updates only reach builds with the same `version` (runtime version policy `appVersion`). |
| Try a build on your own phone first | `npx eas-cli build --platform ios --profile preview` installs through a link (your device must be registered: `eas device:create`). |

Build numbers increment automatically (`autoIncrement`, stored on EAS). Never reuse a `version` for a build with different native code,
or old installs would download JavaScript that doesn't match their native side.

## Development build vs the real app

The real app is `com.legityleague.app` ("Legity League", `app.json`). Local development uses a separate app,
`com.legityleague.app.dev` ("Legity League Dev", scheme `legityleague-dev`), so it installs next to the TestFlight/App Store build
instead of replacing it (iOS allows one app per bundle ID). `mobile/app.config.ts` switches on `APP_VARIANT=development`.

```bash
cd mobile
npm run prebuild:dev     # regenerate ios/ as the dev app (re-add your signing team afterwards, see below)
npm run dev              # Metro for the dev build
```

Install on a phone with Xcode's provisioning permission on (`expo run:ios` doesn't pass it, so a brand-new bundle ID fails):
`xcodebuild -workspace ios/LegityLeagueDev.xcworkspace -scheme LegityLeagueDev -configuration Debug -destination id=<UDID> -allowProvisioningUpdates build`.
The two apps are separate: each has its own sign-in and its own Health permission.

`eas.json` pins `APP_VARIANT` for every profile (`development`, `production`, `preview`), so a stray shell variable can't change which
app a store build is signed for. Never run `eas build` for production with `APP_VARIANT=development` exported.

## Notes

- `mobile/.env` is gitignored, so cloud builds read the public Supabase URL and anon key from `eas.json`.
- Background Apple Health sync needs the HealthKit background-delivery entitlement, which `app.json` turns on. iOS only wakes the
  app for new sleep if it wasn't force-quit.
- Before the public App Store: a privacy policy URL, the App Privacy answers (health data: sleep, linked to the user, used for
  app functionality only), screenshots, and a demo account for reviewers. Account deletion is already in the app (Me → Account).
