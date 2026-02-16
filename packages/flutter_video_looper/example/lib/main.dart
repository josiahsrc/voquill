import 'package:flutter/material.dart';
import 'package:flutter_video_looper/flutter_video_looper.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(
          title: const Text('Video Looper Example'),
        ),
        body: const Center(
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: FlutterVideoLooper.asset(
              path: 'assets/videos/sample.mp4',
              isPipEnabled: true,
            ),
          ),
        ),
      ),
    );
  }
}
