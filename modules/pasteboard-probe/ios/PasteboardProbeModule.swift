import ExpoModulesCore
import UIKit

// detectPatterns only reports what kind of text is on the pasteboard, so iOS
// shows no "Allow Paste" prompt. Reading the text itself still would.
public class PasteboardProbeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PasteboardProbe")

    AsyncFunction("hasWebUrlAsync") { (promise: Promise) in
      let board = UIPasteboard.general
      guard board.hasStrings || board.hasURLs else {
        promise.resolve(false)
        return
      }
      board.detectPatterns(for: [.probableWebURL]) { result in
        switch result {
        case .success(let found):
          promise.resolve(found.contains(.probableWebURL))
        case .failure:
          promise.resolve(false)
        }
      }
    }
  }
}
