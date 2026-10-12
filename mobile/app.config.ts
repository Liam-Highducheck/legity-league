import type { ConfigContext, ExpoConfig } from 'expo/config'

// app.json holds the real (store) app. Setting APP_VARIANT=development turns it into a separate "Legity League Dev" app with
// its own bundle ID, so a development build and the TestFlight/App Store build can be installed side by side. iOS allows
// only one app per bundle ID, so without this a TestFlight install replaces the dev build and vice versa.
//
// Release is the default, and eas.json sets APP_VARIANT explicitly for every profile, so a stray shell variable can't change
// which app a store build is signed for. Local development goes through the `dev` and `ios:dev` scripts in package.json.
export default ({ config }: ConfigContext): ExpoConfig => {
  if (process.env.APP_VARIANT !== 'development') return config as ExpoConfig

  const bundle = `${config.ios?.bundleIdentifier ?? 'com.legityleague.app'}.dev`
  return {
    ...config,
    name: 'Legity League Dev',
    scheme: 'legityleague-dev',
    // a purple icon with a DEV band, so the dev app is obvious next to the real one (regenerate with scripts/make-icons.py)
    icon: './assets/icon-dev.png',
    ios: { ...config.ios, bundleIdentifier: bundle },
    android: {
      ...config.android,
      package: bundle,
      adaptiveIcon: { ...config.android?.adaptiveIcon, backgroundImage: './assets/android-icon-background-dev.png' },
    },
  } as ExpoConfig
}
