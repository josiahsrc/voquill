import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';

part 'remote_state.draft.dart';

enum DictationPillStatus { idle, recording, processing }

enum DictationContext { none, main, review }

@draft
class RemoteState with EquatableMixin {
  final Map<String, RemoteSessionState> sessionById;

  const RemoteState({this.sessionById = const {}});

  RemoteSessionState session(String id) =>
      sessionById[id] ?? const RemoteSessionState();

  @override
  List<Object?> get props => [sessionById];
}

@draft
class RemoteSessionState with EquatableMixin {
  final DictationPillStatus status;
  final DictationContext dictationContext;
  final double audioLevel;
  final String partialText;
  final bool isLoading;
  final bool isDenying;
  final List<String> historyIds;

  const RemoteSessionState({
    this.status = DictationPillStatus.idle,
    this.dictationContext = DictationContext.none,
    this.audioLevel = 0,
    this.partialText = '',
    this.isLoading = false,
    this.isDenying = false,
    this.historyIds = const [],
  });

  bool get isRecording => status == DictationPillStatus.recording;
  bool get isIdle => status == DictationPillStatus.idle;

  DictationPillStatus statusFor(DictationContext ctx) =>
      dictationContext == ctx ? status : DictationPillStatus.idle;

  double audioLevelFor(DictationContext ctx) =>
      dictationContext == ctx ? audioLevel : 0;

  bool isRecordingFor(DictationContext ctx) =>
      dictationContext == ctx && isRecording;

  String partialTextFor(DictationContext ctx) =>
      dictationContext == ctx ? partialText : '';

  @override
  List<Object?> get props => [
    status,
    dictationContext,
    audioLevel,
    partialText,
    isLoading,
    isDenying,
    historyIds,
  ];
}
