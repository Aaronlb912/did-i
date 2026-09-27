import AppIntents
import UIKit

// "Hey Siri, add a question in Did I." Siri asks for the question, then opens
// didi://add?q=..., the same link the Android shortcut and Assistant use.
struct DidIAddQuestionIntent: AppIntent {
  static let title: LocalizedStringResource = "Add a question"
  static let description = IntentDescription("Opens Did I with a new question filled in.")
  static let openAppWhenRun: Bool = true

  @Parameter(title: "Question", requestValueDialog: "What should Did I ask you?")
  var question: String

  @MainActor
  func perform() async throws -> some IntentResult {
    var link = URLComponents()
    link.scheme = "didi"
    link.host = "add"
    link.queryItems = [URLQueryItem(name: "q", value: question)]
    if let url = link.url {
      await UIApplication.shared.open(url)
    }
    return .result()
  }
}

struct DidIShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: DidIAddQuestionIntent(),
      phrases: [
        "Add a question in \(.applicationName)",
        "Add to \(.applicationName)",
        "New \(.applicationName) question",
      ],
      shortTitle: "Add a question",
      systemImageName: "plus.circle"
    )
  }
}
