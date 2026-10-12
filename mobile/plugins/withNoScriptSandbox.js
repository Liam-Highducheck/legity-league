// React Native's "Bundle React Native code and images" build phase writes into the app bundle,
// which Xcode's user-script sandbox blocks ("Operation not permitted"). Turn the sandbox off for the app target.
const { withXcodeProject } = require('expo/config-plugins')

module.exports = (config) =>
  withXcodeProject(config, (cfg) => {
    const configs = cfg.modResults.pbxXCBuildConfigurationSection()
    for (const key of Object.keys(configs)) {
      const c = configs[key]
      if (c && c.buildSettings && c.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING !== undefined) {
        c.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO'
      }
    }
    return cfg
  })
