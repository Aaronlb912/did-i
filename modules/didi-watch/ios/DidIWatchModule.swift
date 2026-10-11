import ExpoModulesCore
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
  private var pending: [[String: Any]] = []
  private let lock = NSLock()

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
  }

  private func handle(_ info: [String: Any]) {
    guard let id = info["id"] as? String,
          let answer = info["answer"] as? String,
          answer == "did" || answer == "nope" else { return }
    let tap: [String: Any] = [
      "id": id,
      "answer": answer,
      "dateIso": info["dateIso"] as? String ?? "",
      "night": info["night"] as? String ?? "",
      "at": info["at"] as? Double ?? 0,
    ]
    DispatchQueue.main.async {
      if self.listening, let onTap = self.onTap {
        onTap(tap)
        return
      }
      self.lock.lock()
      self.pending.append(tap)
      if self.pending.count > 50 { self.pending.removeFirst(self.pending.count - 50) }
      self.lock.unlock()
    }
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
}
