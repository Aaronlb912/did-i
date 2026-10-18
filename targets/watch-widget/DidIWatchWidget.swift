import SwiftUI
import WidgetKit

// "1 of 3": tonight's questions answered on the watch face. Reads the cards
// the watch app (targets/watch) keeps in the App Group.
struct CountEntry: TimelineEntry {
  let date: Date
  let answered: Int
  let total: Int
  // "{a} of {b}" in the phone's language, from the cards.
  var countLabel: String? = nil
}

private struct StoredCards: Decodable {
  struct Item: Decodable { let status: String; let dateIso: String?; let counted: Bool? }
  let items: [Item]
  let countLabel: String?
  // Today's meter from the phone (native/watch-sync.js); nil from an older build.
  let done: Int?
  let later: Int?

  // Same check as WatchCards.stale in targets/watch: the newest card is from
  // before yesterday on the watch's calendar.
  var stale: Bool {
    guard let newest = items.compactMap({ $0.dateIso }).max(), newest.count == 10 else { return false }
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = .current
    guard let yesterday = calendar.date(byAdding: .day, value: -1, to: Date()) else { return false }
    let f = DateFormatter()
    f.calendar = calendar
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = .current
    f.dateFormat = "yyyy-MM-dd"
    return newest < f.string(from: yesterday)
  }
}

private func readCount() -> CountEntry {
  let defaults = UserDefaults(suiteName: "group.com.aaronbryant.didi")
  guard let json = defaults?.string(forKey: "didi.watch.cards"),
        let data = json.data(using: .utf8),
        let cards = try? JSONDecoder().decode(StoredCards.self, from: data) else {
    return CountEntry(date: Date(), answered: 0, total: 0)
  }
  if cards.stale { return CountEntry(date: Date(), answered: 0, total: 0) }
  // The same count as the watch app's card (CardView) and Today's meter: Did
  // only, counted cards plus the ones already off the stack. An older phone
  // build sends no done; then every card and every answer, the old way.
  let todays = cards.done != nil
  let mine = todays ? cards.items.filter { $0.counted ?? true } : cards.items
  let offDone = max(cards.done ?? 0, 0)
  let total = mine.count + offDone + max(cards.later ?? 0, 0)
  let answered = todays ? mine.filter { $0.status == "did" }.count + offDone : cards.items.filter { $0.status != "open" }.count
  return CountEntry(date: Date(), answered: answered, total: total, countLabel: cards.countLabel)
}

struct CountProvider: TimelineProvider {
  func placeholder(in context: Context) -> CountEntry {
    CountEntry(date: Date(), answered: 1, total: 3)
  }

  func getSnapshot(in context: Context, completion: @escaping (CountEntry) -> Void) {
    completion(readCount())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<CountEntry>) -> Void) {
    let entry = readCount()
    // The watch app reloads this on every change; this is only a fallback.
    let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

struct CountView: View {
  @Environment(\.widgetFamily) var family
  let entry: CountEntry

  private var line: String {
    if let label = entry.countLabel, !label.isEmpty {
      return label
        .replacingOccurrences(of: "{a}", with: String(entry.answered))
        .replacingOccurrences(of: "{b}", with: String(entry.total))
    }
    return String(localized: "\(entry.answered) of \(entry.total)")
  }

  var body: some View {
    switch family {
    case .accessoryCircular:
      if entry.total > 0 {
        Gauge(value: Double(entry.answered), in: 0...Double(entry.total)) {
          Text("Did I")
        } currentValueLabel: {
          Text("\(entry.answered)/\(entry.total)")
        }
        .gaugeStyle(.accessoryCircularCapacity)
      } else {
        Text("Did I")
          .font(.caption2)
      }
    case .accessoryInline:
      Text(entry.total > 0 ? "Did I \(line)" : String(localized: "Did I"))
    default:
      VStack(alignment: .leading) {
        Text("Did I")
          .font(.headline)
        Text(entry.total > 0 ? line : String(localized: "Open Did I on your iPhone"))
          .font(.body)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}

@main
struct DidIWatchWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "DidIWatchCount", provider: CountProvider()) { entry in
      CountView(entry: entry)
        .containerBackground(.clear, for: .widget)
    }
    .configurationDisplayName("Did I")
    .description(String(localized: "Questions answered today"))
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}
