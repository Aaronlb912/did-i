const fs = require('node:fs')
const path = require('node:path')
const { IOSConfig, withDangerousMod, withXcodeProject } = require('@expo/config-plugins')

const FILE = 'DidIAddIntent.swift'

/** Copies the Siri "Add a question" App Intent into the main app target. */
module.exports = function withSiriAdd(config) {
  config = withDangerousMod(config, [
    'ios',
    (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, cfg.modRequest.projectName)
      fs.copyFileSync(path.join(__dirname, 'siri', FILE), path.join(dir, FILE))
      return cfg
    },
  ])
  return withXcodeProject(config, (cfg) => {
    const name = cfg.modRequest.projectName
    const project = cfg.modResults
    if (!project.hasFile(`${name}/${FILE}`)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath: `${name}/${FILE}`, groupName: name, project })
    }
    return cfg
  })
}
