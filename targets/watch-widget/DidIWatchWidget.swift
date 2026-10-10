import SwiftUI
import WidgetKit

// "1 of 3": tonight's questions answered on the watch face. Reads the cards
// the watch app (targets/watch) keeps in the App Group.
struct CountEntry: TimelineEntry {
  let date: Date
  let answered: Int
  let total: Int
}

private struct StoredCards: Decodable {
  struct Item: Decodable { let status: String }
  let items: [Item]
}

private func readCount() -> (Int, Int) {
  let defaults = UserDefaults(suiteName: "group.com.aaronbryant.didi")
  guard let json = defaults?.string(forKey: "didi.watch.cards"),
        let data = json.data(using: .utf8),
        let cards = try? JSONDecoder().decode(StoredCards.self, from: data) else { return (0, 0) }
  let answered = cards.items.filter { $0.status != "open" }.count
  return (answered, cards.items.count)
}

struct CountProvider: TimelineProvider {
  func placeholder(in context: Context) -> CountEntry {
    CountEntry(date: Date(), answered: 1, total: 3)
  }

  func getSnapshot(in context: Context, completion: @escaping (CountEntry) -> Void) {
    let (answered, total) = readCount()
    completion(CountEntry(date: Date(), answered: answered, total: total))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<CountEntry>) -> Void) {
    let (answered, total) = readCount()
    let entry = CountEntry(date: Date(), answered: answered, total: total)
    // The watch app reloads this on every change; this is only a fallback.
    let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

struct CountView: View {
  @Environment(\.widgetFamily) var family
  let entry: CountEntry

  private var line: String {
    String(localized: "\(entry.answered) of \(entry.total)")
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
    .description(String(localized: "Questions answered tonight"))
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}
