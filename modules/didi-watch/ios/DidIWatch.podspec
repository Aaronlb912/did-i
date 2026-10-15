Pod::Spec.new do |s|
  s.name           = 'DidIWatch'
  s.version        = '1.0.0'
  s.summary        = 'Sends tonight to the Apple Watch and takes taps back.'
  s.author         = ''
  s.homepage       = 'https://did-i.app'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '17.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.swift'
end
