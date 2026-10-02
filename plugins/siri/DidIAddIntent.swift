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

enum DidIAnswerChoice: String, AppEnum {
  case did
  case nope

  static let typeDisplayRepresentation: TypeDisplayRepresentation = "Answer"
  static let caseDisplayRepresentations: [DidIAnswerChoice: DisplayRepresentation] = [
    .did: "Did",
    .nope: "Nope",
  ]
}

// "Hey Siri, answer Did I." Siri asks which question and Did or Nope, then
// opens didi://answer?q=...&a=did. The app matches the words to tonight's
// open questions (src/lib/voice-answer.js) and saves it like a widget tap.
struct DidIAnswerIntent: AppIntent {
  static let title: LocalizedStringResource = "Answer a question"
  static let description = IntentDescription("Answers one of tonight's questions in Did I.")
  static let openAppWhenRun: Bool = true

  @Parameter(title: "Question", requestValueDialog: "Which question?")
  var question: String

  @Parameter(title: "Answer", requestValueDialog: "Did you, or nope?")
  var answer: DidIAnswerChoice

  @MainActor
  func perform() async throws -> some IntentResult {
    var link = URLComponents()
    link.scheme = "didi"
    link.host = "answer"
    link.queryItems = [URLQueryItem(name: "q", value: question), URLQueryItem(name: "a", value: answer.rawValue)]
    if let url = link.url {
      await UIApplication.shared.open(url)
    }
    return .result()
  }
}

struct DidIShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: DidIAnswerIntent(),
      phrases: [
        "Answer \(.applicationName)",
        "Answer a question in \(.applicationName)",
        "Check in with \(.applicationName)",
      ],
      shortTitle: "Answer a question",
      systemImageName: "checkmark.circle"
    )
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
