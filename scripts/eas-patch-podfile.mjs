import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const path = 'ios/Podfile'
if (!existsSync(path)) {
  process.exit(0)
}

const marker = 'withIosPodResourceBundles'
let contents = readFileSync(path, 'utf8')
if (contents.includes(marker)) {
  process.exit(0)
}

const snippet = `  # ${marker}
  installer.target_installation_results.pod_target_installation_results.each do |pod_name, target_installation_result|
    target_installation_result.resource_bundle_targets.each do |resource_bundle_target|
      resource_bundle_target.build_configurations.each do |config|
        config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
      end
    end
  end
`

if (contents.includes('post_install do |installer|')) {
  contents = contents.replace('post_install do |installer|', `post_install do |installer|\n${snippet}`)
} else {
  contents += `\npost_install do |installer|\n${snippet}\nend\n`
}

writeFileSync(path, contents)
console.log('Patched ios/Podfile for pod resource bundle signing.')
