import ActivityKit
import SwiftUI
import WidgetKit

struct DictationLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DictationAttributes.self) { context in
            LockScreenView(state: context.state)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "mic.fill")
                        .foregroundColor(.red)
                        .font(.title2)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(formatElapsed(context.state.elapsedSeconds))
                        .font(.system(.title3, design: .monospaced))
                        .foregroundColor(.secondary)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text("Recording...")
                        .font(.headline)
                }
            } compactLeading: {
                Image(systemName: "mic.fill")
                    .foregroundColor(.red)
            } compactTrailing: {
                Text("REC")
                    .font(.caption2)
                    .bold()
                    .foregroundColor(.red)
            } minimal: {
                Image(systemName: "mic.fill")
                    .foregroundColor(.red)
            }
        }
    }

    private func formatElapsed(_ seconds: Int) -> String {
        let m = seconds / 60
        let s = seconds % 60
        return String(format: "%d:%02d", m, s)
    }
}

private struct LockScreenView: View {
    let state: DictationAttributes.ContentState

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "mic.fill")
                .font(.title2)
                .foregroundColor(.red)

            VStack(alignment: .leading, spacing: 2) {
                Text("Recording...")
                    .font(.headline)
                Text(formatElapsed(state.elapsedSeconds))
                    .font(.system(.subheadline, design: .monospaced))
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding()
    }

    private func formatElapsed(_ seconds: Int) -> String {
        let m = seconds / 60
        let s = seconds % 60
        return String(format: "%d:%02d", m, s)
    }
}
