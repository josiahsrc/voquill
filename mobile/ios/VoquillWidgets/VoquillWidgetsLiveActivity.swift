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
                    HStack(spacing: 8) {
                        Image("VoquillLogo")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 24, height: 24)
                            .clipShape(RoundedRectangle(cornerRadius: 6))

                        Text("Voquill is active")
                            .font(.headline)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Link(destination: URL(string: "voquill://stop")!) {
                        Image(systemName: "power")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 30, height: 30)
                            .background(Color.white.opacity(0.2))
                            .clipShape(Circle())
                    }
                }
            } compactLeading: {
                Image("VoquillLogo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 16, height: 16)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
            } compactTrailing: {
                if context.state.phase == "recording" {
                    Image(systemName: "mic.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.white)
                } else {
                    Image(systemName: "mic.slash.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
            } minimal: {
                Image("VoquillLogo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 16, height: 16)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
            }
        }
    }
}

private struct LockScreenView: View {
    let state: DictationAttributes.ContentState

    var body: some View {
        HStack(spacing: 12) {
            Image("VoquillLogo")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 36, height: 36)
                .clipShape(RoundedRectangle(cornerRadius: 8))

            Text("Voquill is active")
                .font(.headline)

            Spacer()

            Link(destination: URL(string: "voquill://stop")!) {
                Image(systemName: "power")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 36, height: 36)
                    .background(Color.white.opacity(0.15))
                    .clipShape(Circle())
            }
        }
        .padding()
    }
}
