import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

class FlutterVideoLooper extends StatefulWidget {
  final String path;
  final bool isPipEnabled;

  const FlutterVideoLooper.asset({
    super.key,
    required this.path,
    this.isPipEnabled = false,
  });

  @override
  State<FlutterVideoLooper> createState() => _FlutterVideoLooperState();
}

class _FlutterVideoLooperState extends State<FlutterVideoLooper>
    with WidgetsBindingObserver {
  static const _viewType = 'flutter_video_looper';
  MethodChannel? _channel;

  @override
  void initState() {
    super.initState();
    if (widget.isPipEnabled) {
      WidgetsBinding.instance.addObserver(this);
    }
  }

  @override
  void dispose() {
    if (widget.isPipEnabled) {
      WidgetsBinding.instance.removeObserver(this);
    }
    _channel?.invokeMethod('dispose');
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!widget.isPipEnabled) return;
    if (state == AppLifecycleState.inactive) {
      _channel?.invokeMethod('enterPip');
    }
  }

  void _onPlatformViewCreated(int id) {
    _channel = MethodChannel('flutter_video_looper_$id');
  }

  Map<String, dynamic> get _creationParams => {
        'assetPath': widget.path,
        'isPipEnabled': widget.isPipEnabled,
      };

  @override
  Widget build(BuildContext context) {
    if (Platform.isIOS) {
      return UiKitView(
        viewType: _viewType,
        creationParams: _creationParams,
        creationParamsCodec: const StandardMessageCodec(),
        onPlatformViewCreated: _onPlatformViewCreated,
      );
    }
    if (Platform.isAndroid) {
      return AndroidView(
        viewType: _viewType,
        creationParams: _creationParams,
        creationParamsCodec: const StandardMessageCodec(),
        onPlatformViewCreated: _onPlatformViewCreated,
      );
    }
    return const SizedBox.shrink();
  }
}
