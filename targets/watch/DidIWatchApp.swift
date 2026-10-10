import SwiftUI

@main
struct DidIWatchApp: App {
  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }
}

struct ContentView: View {
  var body: some View {
    VStack(spacing: 8) {
      Text("Did I")
        .font(.headline)
      Text("Open Did I on your iPhone")
        .font(.footnote)
        .multilineTextAlignment(.center)
        .foregroundStyle(.secondary)
    }
    .padding()
  }
}
