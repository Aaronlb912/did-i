import SwiftUI
import WatchConnectivity
import WatchKit
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

// The look's dark colours (native/watch-sync.js). Each one is optional.
struct WatchColors: Codable, Equatable {
  var accent: String?
  var ink: String?
  var soft: String?
  var card: String?
  var card2: String?
  var line: String?
  var bg: String?
}

// One shape in the widget's part format: a kind letter, then numbers and
// colour strings, e.g. ["e", 24, 30, 15, 14, "#f0a64a"]. Never fails to
// decode: anything odd becomes a part with no kind, which draws nothing.
enum PartValue: Codable, Equatable {
  case number(Double)
  case text(String)

  init(from decoder: Decoder) throws {
    let c = try decoder.singleValueContainer()
    if let d = try? c.decode(Double.self) {
      self = .number(d)
    } else {
      self = .text((try? c.decode(String.self)) ?? "")
    }
  }

  func encode(to encoder: Encoder) throws {
    var c = encoder.singleValueContainer()
    switch self {
    case .number(let d): try c.encode(d)
    case .text(let s): try c.encode(s)
    }
  }
}

struct ShapePart: Codable, Equatable {
  var kind: String
  var values: [PartValue]

  init(from decoder: Decoder) throws {
    kind = ""
    values = []
    guard var c = try? decoder.unkeyedContainer() else { return }
    var all: [PartValue] = []
    while !c.isAtEnd {
      if let d = try? c.decode(Double.self) {
        all.append(.number(d))
      } else if let s = try? c.decode(String.self) {
        all.append(.text(s))
      } else if (try? c.decodeNil()) == true {
        all.append(.number(0))
      } else {
        // Something we cannot read (a nested list): leave the part off.
        return
      }
    }
    if case .text(let k)? = all.first {
      kind = k
      values = all
    }
  }

  func encode(to encoder: Encoder) throws {
    var c = encoder.unkeyedContainer()
    for value in values { try c.encode(value) }
  }

  func num(_ i: Int) -> CGFloat {
    guard i < values.count, case .number(let d) = values[i], d.isFinite else { return 0 }
    return CGFloat(d)
  }

  func text(_ i: Int) -> String {
    guard i < values.count, case .text(let s) = values[i] else { return "" }
    return s
  }
}

struct WatchBuddy: Codable, Equatable {
  var parts: [ShapePart]
  var behind: [ShapePart]?
  var front: [ShapePart]?
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
  // Look, buddy, streak and cheer. Optional for the same reason.
  var colors: WatchColors?
  var buddy: WatchBuddy?
  var streak: Int?
  var streakLabel: String?
  var streakOneLabel: String?
  var cheer: [String]?
}

extension WatchCards {
  // From a past night: the newest card's dateIso is before yesterday on the
  // watch's calendar. Tonight (boardDate) is always today or, before the day
  // fold, yesterday, so this never hides tonight's cards.
  var stale: Bool {
    guard let newest = items.map({ $0.dateIso }).max(), newest.count == 10 else { return false }
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

// "{n} left" from the phone, with the number put in.
func fill(_ template: String?, _ vars: [String: Int]) -> String? {
  guard var text = nonEmpty(template) else { return nil }
  for (key, value) in vars { text = text.replacingOccurrences(of: "{\(key)}", with: String(value)) }
  return text
}

// "#rrggbb", "#rgb", "#rrggbbaa" or "transparent". nil when it is none of those.
func hexColor(_ raw: String?) -> Color? {
  guard let raw else { return nil }
  let s = raw.trimmingCharacters(in: .whitespaces).lowercased()
  if s == "transparent" { return .clear }
  guard s.hasPrefix("#") else { return nil }
  var h = String(s.dropFirst())
  if h.count == 3 { h = h.map { "\($0)\($0)" }.joined() }
  guard h.count == 6 || h.count == 8, let v = UInt64(h, radix: 16) else { return nil }
  let rgb = h.count == 8 ? v >> 8 : v
  let alpha = h.count == 8 ? Double(v & 0xff) / 255 : 1
  return Color(
    .sRGB,
    red: Double((rgb >> 16) & 0xff) / 255,
    green: Double((rgb >> 8) & 0xff) / 255,
    blue: Double(rgb & 0xff) / 255,
    opacity: alpha
  )
}

// The app's lime dark palette when the phone sent no colours.
struct Palette {
  var accent: Color
  var ink: Color
  var soft: Color
  var card: Color
  var card2: Color
  var line: Color
  var bg: Color

  init(_ c: WatchColors?) {
    accent = hexColor(c?.accent) ?? Color(red: 0xc9 / 255, green: 0xf2 / 255, blue: 0x4d / 255)
    ink = hexColor(c?.ink) ?? Color(red: 0xf4 / 255, green: 0xf6 / 255, blue: 0xfa / 255)
    soft = hexColor(c?.soft) ?? Color(red: 0x99 / 255, green: 0xa1 / 255, blue: 0xb0 / 255)
    card = hexColor(c?.card) ?? Color(red: 0x16 / 255, green: 0x19 / 255, blue: 0x1f / 255)
    card2 = hexColor(c?.card2) ?? Color(red: 0x1d / 255, green: 0x21 / 255, blue: 0x2a / 255)
    line = hexColor(c?.line) ?? Color(red: 0x2b / 255, green: 0x31 / 255, blue: 0x40 / 255)
    bg = hexColor(c?.bg) ?? .black
  }
}

// Last cards from the iPhone, kept in the App Group so the complication
// (targets/watch-widget) can read them too.
final class CardStore: NSObject, ObservableObject, WCSessionDelegate {
  static let shared = CardStore()
  static let groupId = "group.com.aaronbryant.didi"
  static let key = "didi.watch.cards"

  @Published private(set) var cards: WatchCards?
  // Set by the answer that finishes the night; the done screen plays the burst once.
  @Published var justFinished = false

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

  // Recent taps (id, answer, night, at), like CardStore.kt on Wear OS.
  static let tapsKey = "didi.watch.taps"
  // How long a tap stays on the watch at most. save() drops it sooner, once
  // the phone's cards show it answered or no longer carry that card.
  static let tapHoldMs: Double = 24 * 60 * 60 * 1000

  private func recentTaps(now: Double) -> [[String: Any]] {
    let all = defaults.array(forKey: CardStore.tapsKey) as? [[String: Any]] ?? []
    return all.filter { now - (($0["at"] as? Double) ?? 0) < CardStore.tapHoldMs }
  }

  // Cards from the phone. Taps the phone has not taken yet stay answered.
  private func save(_ json: String) {
    guard var next = CardStore.decode(json) else { return }
    let taps = recentTaps(now: Date().timeIntervalSince1970 * 1000)
    // When the phone sent these. A tap it already had is older: its word wins (an undo).
    let raw = (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [String: Any]
    let builtAt = (raw?["at"] as? Double) ?? 0
    var keep: [[String: Any]] = []
    for tap in taps {
      guard let id = tap["id"] as? String, let night = tap["night"] as? String,
            let answer = tap["answer"] as? String else { continue }
      if let sentAt = tap["sentAt"] as? Double, sentAt > 0, builtAt > sentAt { continue }
      var stillOpen = false
      for i in next.items.indices where next.items[i].id == id && next.items[i].night == night && next.items[i].status == "open" {
        next.items[i].status = answer
        stillOpen = true
      }
      if stillOpen { keep.append(tap) }
    }
    defaults.set(keep, forKey: CardStore.tapsKey)
    if let data = try? JSONEncoder().encode(next), let stored = String(data: data, encoding: .utf8) {
      defaults.set(stored, forKey: CardStore.key)
    } else {
      defaults.set(json, forKey: CardStore.key)
    }
    let ready = next
    DispatchQueue.main.async {
      self.cards = ready
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  var openCards: [WatchCard] {
    (cards?.items ?? []).filter { $0.status == "open" }
  }

  var palette: Palette { Palette(cards?.colors) }

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
    // The last open card, answered Did, with nothing left at Not yet.
    let finished = did && !current.items.isEmpty && current.items.allSatisfy { $0.status == "did" }
    if finished {
      justFinished = true
      WKInterfaceDevice.current().play(.success)
    }
    cards = current
    WidgetCenter.shared.reloadAllTimelines()
    let now = Date().timeIntervalSince1970 * 1000
    let tap: [String: Any] = [
      "id": card.id,
      "answer": answer,
      "night": card.night,
      "dateIso": card.dateIso,
      "at": now,
    ]
    guard WCSession.isSupported() else {
      defaults.set(recentTaps(now: now) + [tap], forKey: CardStore.tapsKey)
      return
    }
    // A message wakes the iPhone app in the background, so the answer lands at
    // once. transferUserInfo only arrives when the phone app next opens, so it
    // is the fallback when the phone is out of reach or the message fails.
    // sentAt: sent by message, so later cards from the phone may undo it.
    // transferUserInfo has no sentAt and keeps the 24h hold.
    let session = WCSession.default
    if session.activationState == .activated && session.isReachable {
      var held = tap
      held["sentAt"] = now
      defaults.set(recentTaps(now: now) + [held], forKey: CardStore.tapsKey)
      session.sendMessage(tap, replyHandler: nil) { _ in
        DispatchQueue.main.async { self.clearSentAt(tap) }
        WCSession.default.transferUserInfo(tap)
      }
    } else {
      defaults.set(recentTaps(now: now) + [tap], forKey: CardStore.tapsKey)
      session.transferUserInfo(tap)
    }
  }

  // The message failed: hold the tap until the phone's cards show it.
  private func clearSentAt(_ tap: [String: Any]) {
    let all = defaults.array(forKey: CardStore.tapsKey) as? [[String: Any]] ?? []
    let next = all.map { item -> [String: Any] in
      guard item["id"] as? String == tap["id"] as? String, item["night"] as? String == tap["night"] as? String,
            item["at"] as? Double == tap["at"] as? Double else { return item }
      var item = item
      item.removeValue(forKey: "sentAt")
      return item
    }
    defaults.set(next, forKey: CardStore.tapsKey)
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
      } else if cards.stale {
        MessageView(title: "Did I", text: nonEmpty(cards.openPhoneLabel) ?? String(localized: "Open Did I on your iPhone"))
      } else if let card = store.openCards.first {
        CardView(card: card)
      } else {
        // Said Not yet to some: they are not done, so do not say all clear.
        let notYet = cards.items.filter { $0.status == "nope" }.count
        let streak = cards.streak ?? 0
        if notYet > 0 {
          DoneView(
            title: fill(cards.notYetLabel, ["n": notYet]) ?? String(localized: "\(notYet) not yet"),
            text: nonEmpty(cards.openPhoneLabel) ?? String(localized: "Open Did I on your iPhone"),
            accentText: false
          )
        } else if streak > 0 {
          DoneView(
            title: nonEmpty(cards.allDoneLabel) ?? String(localized: "All done"),
            text: streak == 1
              ? (nonEmpty(cards.streakOneLabel) ?? fill(cards.streakLabel, ["n": 1]) ?? String(localized: "1 day in a row"))
              : (fill(cards.streakLabel, ["n": streak]) ?? String(localized: "\(streak) days in a row")),
            accentText: true
          )
        } else {
          DoneView(
            title: nonEmpty(cards.allDoneLabel) ?? String(localized: "All done"),
            text: nonEmpty(cards.clearLabel) ?? String(localized: "Nothing left today"),
            accentText: false
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

// Answered of tonight's, drawn just inside the screen edge.
struct ProgressRing: View {
  var progress: Double
  var palette: Palette
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 34, style: .continuous)
    ZStack {
      shape.stroke(palette.line, lineWidth: 4)
      shape
        .trim(from: 0, to: CGFloat(min(max(progress, 0), 1)))
        .stroke(palette.accent, style: StrokeStyle(lineWidth: 4, lineCap: .round))
    }
    .padding(3)
    .animation(reduceMotion ? nil : .easeOut(duration: 0.4), value: progress)
    .ignoresSafeArea()
    .accessibilityHidden(true)
  }
}

struct CardView: View {
  @EnvironmentObject var store: CardStore
  var card: WatchCard

  var body: some View {
    let palette = store.palette
    let items = store.cards?.items ?? []
    let total = items.count
    let answered = items.filter { $0.status != "open" }.count
    let position = min(answered + 1, max(total, 1))
    let count = fill(store.cards?.countLabel, ["a": position, "b": total]) ?? String(localized: "\(position) of \(total)")
    let caption = card.tag.isEmpty ? count : "\(card.tag) · \(count)"
    ZStack {
      ProgressRing(progress: total > 0 ? Double(answered) / Double(total) : 0, palette: palette)
      ScrollView {
        VStack(spacing: 6) {
          if let buddy = store.cards?.buddy {
            BuddyView(buddy: buddy, width: 40)
          }
          Text(caption)
            .font(.system(size: 11, weight: .semibold, design: .monospaced))
            .textCase(.uppercase)
            .foregroundStyle(palette.accent)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          Text(card.question)
            .font(.headline)
            .bold()
            .foregroundStyle(palette.ink)
            .multilineTextAlignment(.center)
            .lineLimit(4)
            .minimumScaleFactor(0.6)
            .fixedSize(horizontal: false, vertical: true)
          HStack(alignment: .top, spacing: 18) {
            RoundAnswer(
              symbol: "clock",
              label: nonEmpty(store.cards?.nopeLabel) ?? String(localized: "Not yet"),
              size: 46,
              fill: palette.card2,
              stroke: palette.line,
              iconColor: palette.soft,
              labelColor: palette.soft
            ) {
              store.answer(card, did: false)
            }
            RoundAnswer(
              symbol: "checkmark",
              label: nonEmpty(store.cards?.didLabel) ?? String(localized: "Did"),
              size: 58,
              fill: palette.accent,
              stroke: nil,
              iconColor: palette.bg,
              labelColor: palette.ink
            ) {
              store.answer(card, did: true)
            }
          }
          .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 8)
      }
    }
  }
}

struct RoundAnswer: View {
  var symbol: String
  var label: String
  var size: CGFloat
  var fill: Color
  var stroke: Color?
  var iconColor: Color
  var labelColor: Color
  var action: () -> Void

  var body: some View {
    VStack(spacing: 3) {
      Button(action: action) {
        Image(systemName: symbol)
          .font(.system(size: size * 0.38, weight: .bold))
          .foregroundStyle(iconColor)
          .frame(width: size, height: size)
          .background(Circle().fill(fill))
          .overlay(Circle().stroke(stroke ?? .clear, lineWidth: 1))
          .contentShape(Circle())
      }
      .buttonStyle(.plain)
      .accessibilityLabel(label)
      Text(label)
        .font(.system(size: 11, weight: .medium))
        .foregroundStyle(labelColor)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .accessibilityHidden(true)
    }
  }
}

// All answered: buddy over a moon, then the title and a line under it.
struct DoneView: View {
  @EnvironmentObject var store: CardStore
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  var title: String
  var text: String
  var accentText: Bool
  @State private var burst = false

  var body: some View {
    let palette = store.palette
    ZStack {
      ScrollView {
        VStack(spacing: 6) {
          if let buddy = store.cards?.buddy {
            BuddyView(buddy: buddy, width: 40)
          }
          ZStack {
            Circle()
              .fill(palette.accent.opacity(0.22))
              .frame(width: 64, height: 64)
              .blur(radius: 10)
            Circle()
              .fill(palette.ink)
              .frame(width: 40, height: 40)
            Circle()
              .fill(palette.bg)
              .frame(width: 36, height: 36)
              .offset(x: 11, y: -7)
          }
          .frame(width: 64, height: 56)
          .accessibilityHidden(true)
          Text(title)
            .font(.headline)
            .foregroundStyle(palette.ink)
            .multilineTextAlignment(.center)
          Text(text)
            .font(.footnote)
            .foregroundStyle(accentText ? palette.accent : palette.soft)
            .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 8)
      }
      if burst {
        CheerBurstView(colors: (store.cards?.cheer ?? []).compactMap { hexColor($0) }, fallback: palette.accent)
          .allowsHitTesting(false)
      }
    }
    .onAppear {
      guard store.justFinished else { return }
      store.justFinished = false
      // The haptic already played on the tap; the burst is motion only.
      guard !reduceMotion else { return }
      burst = true
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { burst = false }
    }
  }
}

// A few dots that fly out from the middle and fade, in the cheer colours.
struct CheerBurstView: View {
  var colors: [Color]
  var fallback: Color
  @State private var go = false

  var body: some View {
    let count = 8
    ZStack {
      ForEach(0..<count, id: \.self) { i in
        let angle = Double(i) / Double(count) * 2 * Double.pi
        let tint = colors.isEmpty ? fallback : colors[i % colors.count]
        Circle()
          .fill(tint)
          .frame(width: 7, height: 7)
          .offset(x: go ? CGFloat(cos(angle)) * 62 : 0, y: go ? CGFloat(sin(angle)) * 62 : 0)
          .scaleEffect(go ? 0.6 : 1)
          .opacity(go ? 0 : 1)
      }
    }
    .onAppear {
      withAnimation(.easeOut(duration: 0.6)) { go = true }
    }
  }
}

// The buddy on the widget's 48x58 grid, drawn the same way as buddyPart in
// widgets/DidITonightWidget.tsx. Accessories behind, buddy, accessories in front.
struct BuddyView: View {
  var buddy: WatchBuddy
  var width: CGFloat

  var body: some View {
    let k = width / 48
    let all = (buddy.behind ?? []) + buddy.parts + (buddy.front ?? [])
    ZStack(alignment: .topLeading) {
      ForEach(Array(all.enumerated()), id: \.offset) { entry in
        BuddyPartView(part: entry.element, k: k, width: width)
      }
    }
    .frame(width: width, height: width * 58 / 48, alignment: .topLeading)
    .accessibilityHidden(true)
  }
}

struct BuddyPartView: View {
  var part: ShapePart
  var k: CGFloat
  var width: CGFloat

  var body: some View {
    let n = part.num
    let tint = hexColor(part.text(5))
    if let tint {
      switch part.kind {
      case "e":
        Ellipse()
          .fill(tint)
          .frame(width: n(3) * 2 * k, height: n(4) * 2 * k)
          .opacity(n(7) != 0 ? Double(n(7)) : 1)
          .rotationEffect(.degrees(Double(n(6))))
          .offset(x: (n(1) - n(3)) * k, y: (n(2) - n(4)) * k)
      case "r":
        RoundedRectangle(cornerRadius: n(6) * k)
          .fill(tint)
          .frame(width: n(3) * k, height: n(4) * k)
          .rotationEffect(.degrees(Double(n(7))))
          .offset(x: n(1) * k, y: n(2) * k)
      case "o":
        Ellipse()
          .strokeBorder(tint, lineWidth: n(6) * k)
          .frame(width: n(3) * 2 * k, height: n(4) * 2 * k)
          .offset(x: (n(1) - n(3)) * k, y: (n(2) - n(4)) * k)
      case "l":
        let dx = n(3) - n(1)
        let dy = n(4) - n(2)
        let len = (dx * dx + dy * dy).squareRoot()
        let w = n(6)
        Rectangle()
          .fill(tint)
          .frame(width: len * k, height: w * k)
          .rotationEffect(.radians(Double(atan2(dy, dx))))
          .offset(x: ((n(1) + n(3)) / 2 - len / 2) * k, y: ((n(2) + n(4)) / 2 - w / 2) * k)
      case "t":
        // Base centre (x, y), half width, height (positive points up).
        Path { p in
          p.move(to: CGPoint(x: (n(1) - n(3)) * k, y: n(2) * k))
          p.addLine(to: CGPoint(x: (n(1) + n(3)) * k, y: n(2) * k))
          p.addLine(to: CGPoint(x: n(1) * k, y: (n(2) - n(4)) * k))
          p.closeSubpath()
        }
        .fill(tint)
        .frame(width: width, height: width * 58 / 48, alignment: .topLeading)
      default:
        EmptyView()
      }
    }
  }
}
