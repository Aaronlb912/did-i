import SwiftUI
import WatchConnectivity
import WidgetKit

@main
struct DidIWatchApp: App {
  @StateObject private var store = CardStore.shared

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(store)
    }
  }
}

struct WatchCard: Codable, Identifiable, Equatable {
  var id: String
  var night: String
  var dateIso: String
  var question: String
  var tag: String
  var status: String
}

struct WatchCards: Codable, Equatable {
  var items: [WatchCard]
  var didLabel: String
  var nopeLabel: String
  var clearLabel: String
  var updatedAt: Double
  // Words in the phone's language (t() in src/locales). Optional so cards
  // stored by an older phone build still decode.
  var emptyLabel: String?
  var leftLabel: String?
  var allDoneLabel: String?
  var notYetLabel: String?
  var countLabel: String?
  var openPhoneLabel: String?
}

// "{n} left" from the phone, with the number put in.
func fill(_ template: String?, _ vars: [String: Int]) -> String? {
  guard var text = nonEmpty(template) else { return nil }
  for (key, value) in vars { text = text.replacingOccurrences(of: "{\(key)}", with: String(value)) }
  return text
}

// Last cards from the iPhone, kept in the App Group so the complication
// (targets/watch-widget) can read them too.
final class CardStore: NSObject, ObservableObject, WCSessionDelegate {
  static let shared = CardStore()
  static let groupId = "group.com.aaronbryant.didi"
  static let key = "didi.watch.cards"

  @Published private(set) var cards: WatchCards?

  private let defaults = UserDefaults(suiteName: CardStore.groupId) ?? .standard

  override init() {
    super.init()
    if let json = defaults.string(forKey: CardStore.key) {
      cards = CardStore.decode(json)
    }
    if WCSession.isSupported() {
      WCSession.default.delegate = self
      WCSession.default.activate()
    }
  }

  static func decode(_ json: String) -> WatchCards? {
    guard let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WatchCards.self, from: data)
  }

  private func save(_ json: String) {
    guard let next = CardStore.decode(json) else { return }
    defaults.set(json, forKey: CardStore.key)
    DispatchQueue.main.async {
      self.cards = next
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  var openCards: [WatchCard] {
    (cards?.items ?? []).filter { $0.status == "open" }
  }

  func answer(_ card: WatchCard, did: Bool) {
    guard var current = cards else { return }
    let answer = did ? "did" : "nope"
    current.items = current.items.map { item in
      var item = item
      if item.id == card.id && item.night == card.night { item.status = answer }
      return item
    }
    if let data = try? JSONEncoder().encode(current), let json = String(data: data, encoding: .utf8) {
      defaults.set(json, forKey: CardStore.key)
    }
    cards = current
    WidgetCenter.shared.reloadAllTimelines()
    guard WCSession.isSupported() else { return }
    let tap: [String: Any] = [
      "id": card.id,
      "answer": answer,
      "night": card.night,
      "dateIso": card.dateIso,
      "at": Date().timeIntervalSince1970 * 1000,
    ]
    // Queued and delivered even when the phone is away or the app is closed.
    WCSession.default.transferUserInfo(tap)
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    if let json = session.receivedApplicationContext["cards"] as? String {
      save(json)
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    if let json = applicationContext["cards"] as? String {
      save(json)
    }
  }
}

struct ContentView: View {
  @EnvironmentObject var store: CardStore

  var body: some View {
    if let cards = store.cards {
      if cards.items.isEmpty {
        MessageView(title: "Did I", text: nonEmpty(cards.emptyLabel) ?? String(localized: "Open Did I on your iPhone"))
      } else if let card = store.openCards.first {
        CardView(card: card)
      } else {
        // Said Not yet to some: they are not done, so do not say all clear.
        let notYet = cards.items.filter { $0.status == "nope" }.count
        if notYet > 0 {
          MessageView(
            title: fill(cards.notYetLabel, ["n": notYet]) ?? String(localized: "\(notYet) not yet"),
            text: nonEmpty(cards.openPhoneLabel) ?? String(localized: "Open Did I on your iPhone")
          )
        } else {
          MessageView(
            title: nonEmpty(cards.allDoneLabel) ?? String(localized: "All done"),
            text: nonEmpty(cards.clearLabel) ?? String(localized: "Nothing left tonight")
          )
        }
      }
    } else {
      MessageView(title: "Did I", text: String(localized: "Open Did I on your iPhone"))
    }
  }
}

func nonEmpty(_ text: String?) -> String? {
  guard let text, !text.isEmpty else { return nil }
  return text
}

struct MessageView: View {
  var title: String
  var text: String

  var body: some View {
    ScrollView {
      VStack(spacing: 8) {
        Text(title)
          .font(.headline)
        Text(text)
          .font(.footnote)
          .multilineTextAlignment(.center)
          .foregroundStyle(.secondary)
      }
      .padding()
    }
  }
}

struct CardView: View {
  @EnvironmentObject var store: CardStore
  var card: WatchCard

  var body: some View {
    let open = store.openCards.count
    ScrollView {
      VStack(alignment: .leading, spacing: 8) {
        if !card.tag.isEmpty {
          Text(card.tag)
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
        Text(card.question)
          .font(.headline)
          .fixedSize(horizontal: false, vertical: true)
        Button(nonEmpty(store.cards?.didLabel) ?? String(localized: "Did")) {
          store.answer(card, did: true)
        }
        .tint(.green)
        Button(nonEmpty(store.cards?.nopeLabel) ?? String(localized: "Not yet")) {
          store.answer(card, did: false)
        }
        if open > 1 {
          Text(fill(store.cards?.leftLabel, ["n": open]) ?? String(localized: "\(open) left"))
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}
