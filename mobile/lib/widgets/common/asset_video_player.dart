import 'package:app/utils/pip_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class PipAssetVideoPlayer extends StatefulWidget {
  const PipAssetVideoPlayer({
    super.key,
    required this.asset,
    this.aspectRatio,
    this.cropInsets = EdgeInsets.zero,
    this.borderRadius,
  });

  static Widget phone({Key? key, required String asset}) {
    return Container(
      height: 400,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.all(Radius.circular(24)),
      ),
      padding: const EdgeInsets.all(4),
      child: PipAssetVideoPlayer(
        key: key,
        asset: asset,
        cropInsets: EdgeInsets.zero,
        borderRadius: BorderRadius.all(Radius.circular(20)),
      ),
    );
  }

  final String asset;
  final double? aspectRatio;
  final EdgeInsets cropInsets;
  final BorderRadius? borderRadius;

  @override
  State<PipAssetVideoPlayer> createState() => _PipAssetVideoPlayerState();
}

class _PipAssetVideoPlayerState extends State<PipAssetVideoPlayer> {
  late final VideoPlayerController _controller;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    PipUtils.instance.enable();
    _controller = VideoPlayerController.asset(widget.asset)
      ..setLooping(true)
      ..setVolume(0)
      ..initialize().then((_) {
        setState(() => _initialized = true);
        _controller.play();
      });
  }

  @override
  void dispose() {
    PipUtils.instance.disable();
    _controller.dispose();
    super.dispose();
  }

  void _togglePlayPause() {
    setState(() {
      if (_controller.value.isPlaying) {
        _controller.pause();
      } else {
        _controller.play();
      }
    });
  }

  double _videoAspectRatio() {
    return widget.aspectRatio ??
        (_initialized ? _controller.value.aspectRatio : 16 / 9);
  }

  double _effectiveAspectRatio(double visibleHeight) {
    final videoAR = _videoAspectRatio();
    if (widget.cropInsets == EdgeInsets.zero) return videoAR;
    final renderW = (visibleHeight + widget.cropInsets.vertical) * videoAR;
    final visibleW = renderW - widget.cropInsets.horizontal;
    return visibleW / visibleHeight;
  }

  @override
  Widget build(BuildContext context) {
    final radius = widget.borderRadius ?? BorderRadius.all(Theming.radius);

    final content = ClipRRect(
      borderRadius: radius,
      child: GestureDetector(
        onTap: _initialized ? _togglePlayPause : null,
        child: Stack(
          fit: StackFit.expand,
          clipBehavior: Clip.none,
          children: [
            if (_initialized)
              Positioned(
                top: -widget.cropInsets.top,
                bottom: -widget.cropInsets.bottom,
                left: -widget.cropInsets.left,
                right: -widget.cropInsets.right,
                child: FittedBox(
                  fit: BoxFit.cover,
                  clipBehavior: Clip.none,
                  child: SizedBox(
                    width: _controller.value.size.width,
                    height: _controller.value.size.height,
                    child: VideoPlayer(_controller),
                  ),
                ),
              )
            else
              const Center(child: CircularProgressIndicator()),
            if (_initialized && !_controller.value.isPlaying)
              Center(
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.black38,
                    shape: BoxShape.circle,
                  ),
                  padding: const EdgeInsets.all(12),
                  child: const Icon(
                    Icons.play_arrow_rounded,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
              ),
          ],
        ),
      ),
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final h = constraints.maxHeight;
        final ar = h.isFinite ? _effectiveAspectRatio(h) : _videoAspectRatio();
        return AspectRatio(aspectRatio: ar, child: content);
      },
    );
  }
}
