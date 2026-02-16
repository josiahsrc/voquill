import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';
import 'package:flutter_video_looper/flutter_video_looper.dart';

class AssetVideoPlayer extends StatelessWidget {
  const AssetVideoPlayer({
    super.key,
    required this.asset,
    this.borderRadius,
    this.pip,
  });

  static Widget phone({Key? key, required String asset, bool? pip}) {
    return Container(
      height: 400,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.all(Radius.circular(24)),
      ),
      padding: const EdgeInsets.all(4),
      child: AssetVideoPlayer(
        key: key,
        asset: asset,
        borderRadius: BorderRadius.all(Radius.circular(20)),
        pip: pip,
      ),
    );
  }

  final String asset;
  final BorderRadius? borderRadius;
  final bool? pip;

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.all(Theming.radius);
    return ClipRRect(
      borderRadius: radius,
      child: FlutterVideoLooper.asset(path: asset, isPipEnabled: pip ?? false),
    );
  }
}
