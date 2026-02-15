//
//  VoquillWidgetsLiveActivity.swift
//  VoquillWidgets
//
//  Created by Josiah on 2/15/26.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct VoquillWidgetsAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct VoquillWidgetsLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: VoquillWidgetsAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension VoquillWidgetsAttributes {
    fileprivate static var preview: VoquillWidgetsAttributes {
        VoquillWidgetsAttributes(name: "World")
    }
}

extension VoquillWidgetsAttributes.ContentState {
    fileprivate static var smiley: VoquillWidgetsAttributes.ContentState {
        VoquillWidgetsAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: VoquillWidgetsAttributes.ContentState {
         VoquillWidgetsAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: VoquillWidgetsAttributes.preview) {
   VoquillWidgetsLiveActivity()
} contentStates: {
    VoquillWidgetsAttributes.ContentState.smiley
    VoquillWidgetsAttributes.ContentState.starEyes
}
