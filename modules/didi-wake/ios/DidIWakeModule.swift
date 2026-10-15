import ExpoModulesCore
import Security
import UIKit

// Two small jobs for answers made away from the app:
//  - the answer key (supabase/answer-keys.sql) in the Keychain, in the app
//    group's access group so the widget's tap intent can read it
//    (patches/expo-widgets: DidIAnswerTap);
//  - silent wakes (supabase/wake-push.sql): JS pulls answers and redraws
//    the widget and the watch, then calls wakeDone so iOS can suspend us.
public class DidIWakeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DidIWake")

    Events("onWake")

    OnStartObserving {
      WakeCenter.shared.setListener { [weak self] in
        self?.sendEvent("onWake", [:])
      }
    }

    OnStopObserving {
      WakeCenter.shared.setListener(nil)
    }

    Function("setAnswerKey") { (json: String) -> Bool in
      AnswerKeychain.save(json)
    }

    Function("clearAnswerKey") {
      AnswerKeychain.clear()
    }

    // A wake that came in before JS was listening.
    Function("takeWake") { () -> Bool in
      WakeCenter.shared.takePending()
    }

    Function("wakeDone") {
      WakeCenter.shared.finish(.newData)
    }
  }
}

enum AnswerKeychain {
  // An app group id works as a Keychain access group for every target in
  // the group, with no extra entitlement. Same strings as the widget patch.
  static let group = "group.com.aaronbryant.didi"
  static let service = "com.aaronbryant.didi.answer-key"

  private static func base() -> [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: "key",
      kSecAttrAccessGroup as String: group,
    ]
  }

  static func save(_ json: String) -> Bool {
    guard json.utf8.count <= 2000 else { return false }
    clear()
    var item = base()
    item[kSecValueData as String] = Data(json.utf8)
    item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    return SecItemAdd(item as CFDictionary, nil) == errSecSuccess
  }

  static func clear() {
    SecItemDelete(base() as CFDictionary)
  }
}

final class WakeCenter {
  static let shared = WakeCenter()
  private static let pendingKey = "didi.wake.pending"
  private let lock = NSLock()
  private var listener: (() -> Void)?
  private var handlers: [(UIBackgroundFetchResult) -> Void] = []

  func setListener(_ next: (() -> Void)?) {
    lock.lock()
    listener = next
    lock.unlock()
  }

  func received(_ done: @escaping (UIBackgroundFetchResult) -> Void) {
    lock.lock()
    handlers.append(done)
    let tell = listener
    lock.unlock()
    if let tell {
      DispatchQueue.main.async { tell() }
    } else {
      // JS is not up yet: it takes this when it starts listening.
      UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: WakeCenter.pendingKey)
    }
    // iOS allows about 30 seconds. Always hand the time back.
    DispatchQueue.main.asyncAfter(deadline: .now() + 25) { [weak self] in
      self?.finish(.noData)
    }
  }

  func takePending() -> Bool {
    let at = UserDefaults.standard.double(forKey: WakeCenter.pendingKey)
    guard at > 0 else { return false }
    UserDefaults.standard.removeObject(forKey: WakeCenter.pendingKey)
    return Date().timeIntervalSince1970 - at < 3600
  }

  func finish(_ result: UIBackgroundFetchResult) {
    lock.lock()
    let waiting = handlers
    handlers = []
    lock.unlock()
    for done in waiting {
      done(result)
    }
  }
}

public class DidIWakeAppDelegate: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    guard userInfo["wake"] != nil else {
      completionHandler(.noData)
      return
    }
    WakeCenter.shared.received(completionHandler)
  }
}
