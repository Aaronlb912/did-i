#!/usr/bin/env bash
# Import distribution cert + provisioning profiles for GHA iOS archive/export.
# Reads env only (GitHub secrets). Never echo secret values.
set -euo pipefail

signing_ready() {
  [ -n "${IOS_DIST_CERT_P12:-}" ] && [ -n "${IOS_DIST_CERT_PASSWORD:-}" ] && [ -n "${IOS_PROVISIONING_PROFILE:-}" ]
}

gha_env() {
  if [ -n "${GITHUB_ENV:-}" ]; then echo "$1" >> "${GITHUB_ENV}"; fi
}

if ! signing_ready; then
  gha_env "SIGNING=0"
  exit 0
fi

gha_env "SIGNING=1"

CERT_PATH="${RUNNER_TEMP}/dist.p12"
echo -n "${IOS_DIST_CERT_P12}" | base64 --decode > "${CERT_PATH}"

KEYCHAIN_PATH="${RUNNER_TEMP}/app-signing.keychain-db"
security create-keychain -p "${KEYCHAIN_PASSWORD:-github-actions}" "${KEYCHAIN_PATH}"
security set-keychain-settings -lut 21600 "${KEYCHAIN_PATH}"
security unlock-keychain -p "${KEYCHAIN_PASSWORD:-github-actions}" "${KEYCHAIN_PATH}"
security import "${CERT_PATH}" -P "${IOS_DIST_CERT_PASSWORD}" -A -t cert -f pkcs12 -k "${KEYCHAIN_PATH}"
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "${KEYCHAIN_PASSWORD:-github-actions}" "${KEYCHAIN_PATH}"
security list-keychain -d user -s "${KEYCHAIN_PATH}"

mkdir -p "${HOME}/Library/MobileDevice/Provisioning Profiles"
EXPORT_PLIST="${RUNNER_TEMP}/ExportOptions.plist"
/usr/libexec/PlistBuddy -c 'Add :method string app-store-connect' "${EXPORT_PLIST}"
/usr/libexec/PlistBuddy -c 'Add :destination string export' "${EXPORT_PLIST}"
/usr/libexec/PlistBuddy -c 'Add :signingStyle string manual' "${EXPORT_PLIST}"
/usr/libexec/PlistBuddy -c 'Add :teamID string 2ZUKFKSSV8' "${EXPORT_PLIST}"
/usr/libexec/PlistBuddy -c 'Add :uploadSymbols bool true' "${EXPORT_PLIST}"
/usr/libexec/PlistBuddy -c 'Add :provisioningProfiles dict' "${EXPORT_PLIST}"

install_profile_b64() {
  local b64="$1"
  local env_prefix="$2"
  local tmp="${RUNNER_TEMP}/profile.mobileprovision"
  local decoded="${RUNNER_TEMP}/profile-decoded.plist"
  echo "Installing profile for ${env_prefix} (${#b64} chars)"
  echo -n "${b64}" | base64 --decode > "${tmp}"
  security cms -D -i "${tmp}" > "${decoded}"
  local uuid name app_id bundle
  uuid="$(/usr/libexec/PlistBuddy -c 'Print :UUID' "${decoded}")"
  name="$(/usr/libexec/PlistBuddy -c 'Print :Name' "${decoded}")"
  app_id="$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:application-identifier' "${decoded}")"
  bundle="${app_id#*.}"
  cp "${tmp}" "${HOME}/Library/MobileDevice/Provisioning Profiles/${uuid}.mobileprovision"
  /usr/libexec/PlistBuddy -c "Add :provisioningProfiles:${bundle} string ${name}" "${EXPORT_PLIST}"
  gha_env "${env_prefix}_BUNDLE=${bundle}"
  gha_env "${env_prefix}_NAME=${name}"
  gha_env "${env_prefix}_UUID=${uuid}"
}

install_profile_b64 "${IOS_PROVISIONING_PROFILE}" "IOS_MAIN_PROFILE"
if [ -n "${IOS_WIDGET_PROVISIONING_PROFILE:-}" ]; then
  install_profile_b64 "${IOS_WIDGET_PROVISIONING_PROFILE}" "IOS_WIDGET_PROFILE"
fi
# Apple Watch app (com.aaronbryant.didi.watchkitapp), only when DIDI_WATCH=1.
if [ -n "${IOS_WATCH_PROVISIONING_PROFILE:-}" ]; then
  install_profile_b64 "${IOS_WATCH_PROVISIONING_PROFILE}" "IOS_WATCH_PROFILE"
fi
# Watch complication (com.aaronbryant.didi.watchkitapp.widget).
if [ -n "${IOS_WATCH_WIDGET_PROVISIONING_PROFILE:-}" ]; then
  install_profile_b64 "${IOS_WATCH_WIDGET_PROVISIONING_PROFILE}" "IOS_WATCH_WIDGET_PROFILE"
fi

gha_env "EXPORT_OPTIONS_PLIST=${EXPORT_PLIST}"
