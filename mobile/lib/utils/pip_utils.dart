import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:pip/pip.dart';

class PipUtils with WidgetsBindingObserver {
  PipUtils._();
  static final PipUtils instance = PipUtils._();

  final Pip _pip = Pip();
  bool _enabled = false;

  Future<void> enable() async {
    if (_enabled) return;
    _enabled = true;
    WidgetsBinding.instance.addObserver(this);

    await _pip.setup(
      PipOptions(
        autoEnterEnabled: true,
        aspectRatioX: 16,
        aspectRatioY: 9,
        controlStyle: 2,
        preferredContentWidth: 480,
        preferredContentHeight: 270,
      ),
    );
  }

  Future<void> disable() async {
    if (!_enabled) return;
    _enabled = false;
    WidgetsBinding.instance.removeObserver(this);

    await _pip.stop();
    await _pip.setup(
      PipOptions(autoEnterEnabled: false),
    );
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_enabled) return;

    if (Platform.isIOS) {
      if (state == AppLifecycleState.inactive) {
        _pip.start();
      } else if (state == AppLifecycleState.resumed) {
        _pip.stop();
      }
    }
  }
}
