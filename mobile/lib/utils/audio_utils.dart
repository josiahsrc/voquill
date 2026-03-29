import 'dart:math';
import 'dart:typed_data';

Uint8List pcm16ToFloat32Bytes(Uint8List pcm16Bytes) {
  final sampleCount = pcm16Bytes.length ~/ 2;
  final pcm16 = ByteData.sublistView(pcm16Bytes);
  final float32 = Float32List(sampleCount);

  for (var i = 0; i < sampleCount; i++) {
    final sample = pcm16.getInt16(i * 2, Endian.little);
    float32[i] = sample / 32768.0;
  }

  return float32.buffer.asUint8List();
}

double computeAudioLevel(Uint8List pcm16Bytes) {
  final sampleCount = pcm16Bytes.length ~/ 2;
  if (sampleCount == 0) return 0;

  const binCount = 12;
  final framesPerBin = max(1, sampleCount ~/ binCount);
  final pcm16 = ByteData.sublistView(pcm16Bytes);

  final bins = List.filled(binCount, 0.0);
  final counts = List.filled(binCount, 0);

  for (var i = 0; i < sampleCount; i++) {
    final sample = pcm16.getInt16(i * 2, Endian.little) / 32768.0;
    final binIndex = min(i ~/ framesPerBin, binCount - 1);
    bins[binIndex] += sample.abs();
    counts[binIndex]++;
  }

  var sum = 0.0;
  var peak = 0.0;

  for (var i = 0; i < binCount; i++) {
    if (counts[i] > 0) {
      bins[i] = (bins[i] / counts[i]).clamp(0.0, 1.0);
    }
    sum += bins[i];
    if (bins[i] > peak) peak = bins[i];
  }

  final avg = sum / binCount;
  final combined = min(1.0, avg * 0.9 + peak * 0.85);
  return min(1.0, sqrt(combined) * 1.35);
}
