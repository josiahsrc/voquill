import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';
import 'package:flutter_video_looper/flutter_video_looper.dart';

class AssetVideoPlayer extends StatelessWidget {
  const AssetVideoPlayer({
    super.key,
    required this.asset,
    required this.aspectRatio,
    this.borderRadius,
    this.pip,
  });

  static Widget phone({
    Key? key,
    required String asset,
    required double aspectRatio,
    bool? pip,
  }) {
    return Container(
      height: 400,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.all(Radius.circular(32)),
      ),
      padding: const EdgeInsets.all(4),
      child: AssetVideoPlayer(
        key: key,
        asset: asset,
        aspectRatio: aspectRatio,
        borderRadius: BorderRadius.all(Radius.circular(28)),
        pip: pip,
      ),
    );
  }

  final String asset;
  final double aspectRatio;
  final BorderRadius? borderRadius;
  final bool? pip;

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.all(Theming.radius);
    return AspectRatio(
      aspectRatio: aspectRatio,
      child: ClipRRect(
        borderRadius: radius,
        child:
            FlutterVideoLooper.asset(path: asset, isPipEnabled: pip ?? false),
      ),
    );
  }
}
