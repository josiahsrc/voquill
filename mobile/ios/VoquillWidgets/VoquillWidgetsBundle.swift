//
//  VoquillWidgetsBundle.swift
//  VoquillWidgets
//
//  Created by Josiah on 2/15/26.
//

import WidgetKit
import SwiftUI

@main
struct VoquillWidgetsBundle: WidgetBundle {
    var body: some Widget {
        VoquillWidgets()
        VoquillWidgetsControl()
        VoquillWidgetsLiveActivity()
    }
}
