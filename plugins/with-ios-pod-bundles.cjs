const { withPodfile } = require('@expo/config-plugins')

const SNIPPET = `  installer.target_installation_results.pod_target_installation_results.each do |pod_name, target_installation_result|
    target_installation_result.resource_bundle_targets.each do |resource_bundle_target|
      resource_bundle_target.build_configurations.each do |config|
        config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
      end
    end
  end
`

const MARKER = 'withIosPodResourceBundles'

/** Xcode 14+ signs pod resource bundles; EAS store builds need this off for some pods (fonts, etc.). */
module.exports = function withIosPodResourceBundles(config) {
  return withPodfile(config, (cfg) => {
    let contents = cfg.modResults.contents
    if (contents.includes(MARKER)) {
      return cfg
    }
    const block = `# ${MARKER}\n${SNIPPET}`
    const rnHook = contents.match(/react_native_post_install\([\s\S]*?\n\s*\)/)
    if (rnHook) {
      contents = contents.replace(rnHook[0], `${rnHook[0]}\n${block}`)
    } else if (contents.includes('post_install do |installer|')) {
      contents = contents.replace(
        'post_install do |installer|',
        `post_install do |installer|\n${block}`,
      )
    } else {
      contents += `\npost_install do |installer|\n${block}\nend\n`
    }
    cfg.modResults.contents = contents
    return cfg
  })
}
