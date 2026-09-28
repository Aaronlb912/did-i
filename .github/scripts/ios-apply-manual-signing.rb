#!/usr/bin/env ruby
# Apply manual signing to the build configs after expo prebuild (GHA has no Xcode UI).
require 'English'
abort 'IOS_MAIN_PROFILE_UUID missing' if ENV['IOS_MAIN_PROFILE_UUID'].to_s.empty?

project_path = File.join(__dir__, '..', '..', 'ios', 'DidI.xcodeproj', 'project.pbxproj')
abort "missing #{project_path}" unless File.file?(project_path)

bundles = {
  # The store app, or com.aaronbryant.didi.dev when building the dev app.
  (ENV['IOS_MAIN_PROFILE_BUNDLE'] || 'com.aaronbryant.didi') => ENV['IOS_MAIN_PROFILE_UUID'],
  'com.aaronbryant.didi.widgets' => ENV['IOS_WIDGET_PROFILE_UUID'],
}.compact

data = File.read(project_path)
team = '2ZUKFKSSV8'

bundles.each do |bundle, uuid|
  pattern = /(PRODUCT_BUNDLE_IDENTIFIER = #{Regexp.escape(bundle)};\n)/
  next unless data.match?(pattern)

  replacement = <<~SETTINGS
    \\1\t\t\t\tCODE_SIGN_STYLE = Manual;
    \t\t\t\tDEVELOPMENT_TEAM = #{team};
    \t\t\t\t"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "Apple Distribution";
    \t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "";
    \t\t\t\tPROVISIONING_PROFILE = #{uuid};
  SETTINGS
  data = data.gsub(pattern, replacement)
end

File.write(project_path, data)
puts "Applied manual signing for #{bundles.keys.join(', ')}"
