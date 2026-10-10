// Who a verified test buy (Apple sandbox, Play license tester) credits.
// Before IAP_LAUNCH_AT every test buy credits, so TestFlight and Play
// testers can try the shop. From then on only ids in IAP_TEST_USERS (the
// App Review account and named testers). No launch date set means the list
// always applies. Real buys never come here.
export function testBuyCredits(userId, env, now = Date.now()) {
  const ids = String(env.IAP_TEST_USERS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  if (ids.includes(userId)) return true
  const launch = Date.parse(String(env.IAP_LAUNCH_AT || '').trim())
  if (Number.isNaN(launch)) return false
  return now < launch
}
