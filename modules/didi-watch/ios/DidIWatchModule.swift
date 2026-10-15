import ExpoModulesCore
import UIKit
import WatchConnectivity

// Sends tonight's cards to the Apple Watch and hands taps from the watch to JS.
// Does nothing when there is no paired watch with the app installed.
public class DidIWatchModule: Module {
  private let bridge = WatchBridge()

  public func definition() -> ModuleDefinition {
    Name("DidIWatch")

    Events("onWatchTap")

    OnStartObserving {
      self.bridge.listening = true
    }

    OnStopObserving {
      self.bridge.listening = false
    }

    OnCreate {
      self.bridge.onTap = { [weak self] tap in
        self?.sendEvent("onWatchTap", tap)
      }
      self.bridge.activate()
    }

    Function("isSupported") { () -> Bool in
      WCSession.isSupported()
    }

    Function("sendCards") { (json: String) in
      self.bridge.send(json)
    }

    // Taps that came in before JS was listening.
    Function("takePendingTaps") { () -> [[String: Any]] in
      self.bridge.takePending()
    }
  }
}

final class WatchBridge: NSObject, WCSessionDelegate {
  var onTap: (([String: Any]) -> Void)?
  var listening = false
  private var lastJson: String?
  // Kept in UserDefaults so taps survive the app being killed before JS listens.
  private static let pendingKey = "didi.watch.pendingTaps"
  private var pending: [[String: Any]] = UserDefaults.standard.array(forKey: WatchBridge.pendingKey) as? [[String: Any]] ?? [] {
    didSet { UserDefaults.standard.set(pending, forKey: WatchBridge.pendingKey) }
  }
  private let lock = NSLock()
  // sendMessage can land and the transferUserInfo fallback still arrive, so
  // the same tap (id, night, at) may come twice. Main queue only.
  private var recentTapKeys: [String] = []

  func activate() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  func send(_ json: String) {
    lock.lock()
    lastJson = json
    lock.unlock()
    push()
  }

  func takePending() -> [[String: Any]] {
    lock.lock()
    defer { lock.unlock() }
    let out = pending
    pending = []
    return out
  }

  private func push() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    guard session.activationState == .activated, session.isPaired, session.isWatchAppInstalled else { return }
    lock.lock()
    let json = lastJson
    lock.unlock()
    guard let json else { return }
    try? session.updateApplicationContext(["cards": json])
    // The context can take a while to land; a message reaches an open watch
    // app at once. Older watch builds ignore it and still get the context.
    if session.isReachable {
      session.sendMessage(["cards": json], replyHandler: nil, errorHandler: nil)
    }
  }

  // done runs once the tap is handed to JS, queued, or dropped as a repeat.
  private func handle(_ info: [String: Any], done: (() -> Void)? = nil) {
    guard let id = info["id"] as? String,
          let answer = info["answer"] as? String,
          answer == "did" || answer == "nope" else {
      done?()
      return
    }
    let tap: [String: Any] = [
      "id": id,
      "answer": answer,
      "dateIso": info["dateIso"] as? String ?? "",
      "night": info["night"] as? String ?? "",
      "at": info["at"] as? Double ?? 0,
    ]
    let key = "\(id)|\(info["night"] as? String ?? "")|\(info["at"] as? Double ?? 0)"
    DispatchQueue.main.async {
      defer { done?() }
      if self.recentTapKeys.contains(key) { return }
      self.recentTapKeys.append(key)
      if self.recentTapKeys.count > 50 { self.recentTapKeys.removeFirst() }
      // Saved first, so a tap survives JS being suspended or the app being
      // killed before it runs. JS takes the queue when told (takePendingTaps).
      self.lock.lock()
      self.pending.append(tap)
      if self.pending.count > 50 { self.pending.removeFirst(self.pending.count - 50) }
      self.lock.unlock()
      self.holdAwake()
      // No tap in the event: JS reads the queue, so nothing is applied twice.
      if self.listening, let onTap = self.onTap { onTap([:]) }
    }
  }

  // A watch tap wakes the app in the background only for a moment. Ask for a
  // little longer so JS can save it and redraw the home screen widget.
  // Main queue only.
  private var awakeTask: UIBackgroundTaskIdentifier = .invalid
  private func holdAwake() {
    guard awakeTask == .invalid else { return }
    awakeTask = UIApplication.shared.beginBackgroundTask(withName: "didi.watch.tap") { [weak self] in
      self?.endAwake()
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self] in self?.endAwake() }
  }

  private func endAwake() {
    guard awakeTask != .invalid else { return }
    UIApplication.shared.endBackgroundTask(awakeTask)
    awakeTask = .invalid
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    if activationState == .activated { push() }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func sessionWatchStateDidChange(_ session: WCSession) {
    push()
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    handle(userInfo)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    handle(message)
  }

  // The watch sends with a replyHandler so it knows the tap landed.
  func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    handle(message) { replyHandler(["ok": true]) }
  }
}
