# Releasing the native app

The app lives in `mobile/` (Expo, iOS and Android). Builds and uploads run on Expo's servers (EAS), so no Xcode archive is
needed. EAS project: `@liams-team/legity-league` (ID in `mobile/app.json`).

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

## Android

Package `com.legityleague.app` (dev variant `.dev`). Sleep comes from Health Connect (`mobile/src/lib/healthSource.android.ts`);
iOS uses Apple Health (`healthSource.ts`). Both feed the same `ingest_sleep_segments` RPC; Android nights are stored with
`source = 'health_connect'`. Health Connect can't wake the app, so Android syncs from the hourly task (6am-2pm) and whenever the app opens.

**Test on an emulator** (no phone needed): install Android Studio, create a Pixel device with a Google Play image (API 35+, arm64),
then from `mobile/`:

```bash
APP_VARIANT=development npx expo run:android   # builds the dev client and installs it on the running emulator
npm run dev                                    # Metro
```

Fake sleep for the emulator: install Google's *Health Connect Toolbox* and add SleepSession records.

**Builds** (signing keys are created and kept by EAS on the first run, say yes):

| Goal | Command |
|---|---|
| APK a friend can install from a link (no Play Console) | `npx eas-cli build -p android --profile preview` |
| Play Store bundle (AAB) | `npx eas-cli build -p android --profile production` |
| Upload it to the Play *Internal testing* track | `npx eas-cli submit -p android --profile production` |

The very first AAB has to be uploaded by hand in Play Console (Testing → Internal testing → Create release); `eas submit` works after
that, with a Google Cloud service account JSON key (`serviceAccountKeyPath` in `eas.json`, never committed).

**Play Console checklist:** developer account ($25, identity check), create the app, fill in the privacy policy URL
(`https://liam-highducheck.github.io/legity-league/privacy.html`, served from `web/public/privacy.html`), Data safety form (health
info: sleep; collected, not shared, deletable in app), the **Health Connect permissions declaration** (READ_SLEEP,
READ_HEALTH_DATA_HISTORY, READ_HEALTH_DATA_IN_BACKGROUND), content rating and target audience. Internal testing: up to 100 testers by
Google-account email, no review. A personal account created after Nov 2023 needs a closed test with 12+ testers for 14 days before
production access.

## Getting a new maintainer building (e.g. Harrison)

Written so a collaborator's Claude can walk them through it. Nothing here needs Liam's Apple or Google passwords.

**What Liam sets up once:** invite them to the Expo account that owns the EAS project (the `owner` in `mobile/app.json`, currently
`liams-team`), to App Store Connect (Users and Access, Developer role, already done for Harrison), and to Google Play Console
(Users and permissions, with release permissions). Check `npx eas-cli project:info` shows `@<owner>/legity-league` while logged in as
the collaborator; if it says they have no access, the Expo invite went to a different account than the one that owns the project.

**What the collaborator does:**

1. `git clone https://github.com/Liam-Highducheck/legity-league.git`, then `npm install` at the repo root (one install for web, mobile and core).
2. `npx eas-cli login` with the Expo account that was invited, then `cd mobile && npx eas-cli project:info` to confirm access.
3. Read `CLAUDE.md` (conventions, shared code in `packages/`, no pushing something that doesn't pass `npm run typecheck` at the root).
4. Ship things (all from `mobile/`; EAS holds the Apple certificate, App Store Connect key and Android keystore, so no Apple/Google login is needed):

| Goal | Command |
|---|---|
| Android APK for friends (link/direct download) | `npx eas-cli build -p android --profile preview` |
| iOS to TestFlight | `npx eas-cli build -p ios --profile production --auto-submit` |
| JavaScript-only change, no store review | `npx eas-cli update --channel production --message "what changed"` (use `--channel preview` for the APKs, and `--environment preview`/`production`) |
| Android to Play internal testing | `npx eas-cli build -p android --profile production`, then `eas submit -p android` (first upload is by hand in Play Console) |

New native libraries (anything added to `mobile/package.json` that has native code) need a real build, not an update.
Updates only reach builds with the same `version` in `mobile/app.json`.

**Local testing:**
- Android: Android Studio, then `APP_VARIANT=development npx expo run:android`. Use **JDK 17** (`JAVA_HOME` to a Temurin 17); Java 25 breaks the native build.
- iOS on a real phone needs the collaborator's own Apple signing team (see "Development build vs the real app"); TestFlight builds through EAS don't.

**Rules that stay with Liam:** database migrations (`supabase db push`; write the migration file and ask), the Apple/Google account owner
settings, and anything that spends money (EAS builds count against the owning Expo plan's quota).

## Notes

- `mobile/.env` is gitignored, so cloud builds read the public Supabase URL and anon key from `eas.json`.
- Background Apple Health sync needs the HealthKit background-delivery entitlement, which `app.json` turns on. iOS only wakes the
  app for new sleep if it wasn't force-quit.
- Before the public App Store: a privacy policy URL, the App Privacy answers (health data: sleep, linked to the user, used for
  app functionality only), screenshots, and a demo account for reviewers. Account deletion is already in the app (Me → Account).
