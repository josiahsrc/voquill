import 'package:flutter/material.dart';
import 'package:rive/rive.dart' hide Animation;

class AppRive extends StatefulWidget {
  const AppRive({
    super.key,
    required this.assetPath,
    required this.lightArtboard,
    required this.darkArtboard,
    this.stateMachine,
    this.fit = Fit.contain,
  });

  final String assetPath;
  final String lightArtboard;
  final String darkArtboard;
  final String? stateMachine;
  final Fit fit;

  @override
  State<AppRive> createState() => _AppRiveState();
}

class _AppRiveState extends State<AppRive> {
  File? _file;
  RiveWidgetController? _controller;
  Brightness? _brightness;

  @override
  void initState() {
    super.initState();
    _loadFile();
  }

  void _loadFile() async {
    final file = await File.asset(
      widget.assetPath,
      riveFactory: Factory.rive,
    );
    if (!mounted || file == null) return;
    _file = file;
    _updateController(Theme.of(context).brightness);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final brightness = Theme.of(context).brightness;
    if (_file != null && brightness != _brightness) {
      _updateController(brightness);
    }
  }

  void _updateController(Brightness brightness) {
    _controller?.dispose();
    final artboardName = brightness == Brightness.dark
        ? widget.darkArtboard
        : widget.lightArtboard;
    setState(() {
      _brightness = brightness;
      _controller = RiveWidgetController(
        _file!,
        artboardSelector: ArtboardSelector.byName(artboardName),
        stateMachineSelector: widget.stateMachine != null
            ? StateMachineSelector.byName(widget.stateMachine!)
            : StateMachineSelector.byDefault(),
      );
    });
  }

  @override
  void dispose() {
    _controller?.dispose();
    _file?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_controller == null) return const SizedBox.shrink();
    return RiveWidget(controller: _controller!, fit: widget.fit);
  }
}
