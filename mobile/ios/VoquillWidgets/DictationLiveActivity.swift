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
                        .foregroundColor(context.state.phase == "recording" ? .red : .secondary)
                        .font(.title2)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(formatElapsed(context.state.elapsedSeconds))
                        .font(.system(.title3, design: .monospaced))
                        .foregroundColor(.secondary)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(phaseLabel(context.state.phase))
                        .font(.headline)
                }
            } compactLeading: {
                Image(systemName: "mic.fill")
                    .foregroundColor(context.state.phase == "recording" ? .red : .secondary)
            } compactTrailing: {
                Text(context.state.phase == "recording" ? "REC" : "...")
                    .font(.caption2)
                    .bold()
                    .foregroundColor(context.state.phase == "recording" ? .red : .secondary)
            } minimal: {
                Image(systemName: "mic.fill")
                    .foregroundColor(.red)
            }
        }
    }

    private func phaseLabel(_ phase: String) -> String {
        switch phase {
        case "recording": return "Recording..."
        case "processing": return "Processing..."
        default: return "Voquill"
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
                .foregroundColor(state.phase == "recording" ? .red : .secondary)

            VStack(alignment: .leading, spacing: 2) {
                Text(state.phase == "recording" ? "Recording..." : "Processing...")
                    .font(.headline)
                Text(formatElapsed(state.elapsedSeconds))
                    .font(.system(.subheadline, design: .monospaced))
                    .foregroundColor(.secondary)
            }

            Spacer()

            Image("AppIcon")
                .resizable()
                .frame(width: 32, height: 32)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .padding()
    }

    private func formatElapsed(_ seconds: Int) -> String {
        let m = seconds / 60
        let s = seconds % 60
        return String(format: "%d:%02d", m, s)
    }
}
