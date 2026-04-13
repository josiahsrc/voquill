import 'package:app/model/desktop_session_model.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/remote_utils.dart';
import 'package:app/widgets/remote/remote_dictation_view.dart';
import 'package:flutter/material.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

class RemoteDictationPage extends StatefulWidget {
  const RemoteDictationPage({super.key, required this.sessionId});

  final String sessionId;

  @override
  State<RemoteDictationPage> createState() => _RemoteDictationPageState();
}

class _RemoteDictationPageState extends State<RemoteDictationPage> {
  late PageController _controller;
  int _currentIndex = 0;
  bool _initialized = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  List<DesktopSession> _sortedSessions(Map<String, DesktopSession> map) {
    final list = map.values.toList();
    list.sort((a, b) => a.id.compareTo(b.id));
    return list;
  }

  void _ensureController(List<DesktopSession> sessions) {
    if (_initialized) return;
    _initialized = true;
    final initial = sessions.indexWhere((s) => s.id == widget.sessionId);
    _currentIndex = initial >= 0 ? initial : 0;
    _controller = PageController(initialPage: _currentIndex);
  }

  @override
  Widget build(BuildContext context) {
    final sessionMap = useAppStore().select(
      context,
      (s) => s.desktopSessionById,
    );
    final sessions = _sortedSessions(sessionMap);
    _ensureController(sessions);

    if (sessions.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Session')),
        body: const SafeArea(
          child: Center(child: Text('No active sessions.')),
        ),
      );
    }

    final safeIndex = _currentIndex.clamp(0, sessions.length - 1);
    final current = sessions[safeIndex];
    final currentHasPending = useAppStore().select(
      context,
      (s) => activeTurnFor(current.id, s) != null,
    );
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(current.name)),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: sessions.length,
                physics: currentHasPending
                    ? const NeverScrollableScrollPhysics()
                    : null,
                onPageChanged: (index) =>
                    setState(() => _currentIndex = index),
                itemBuilder: (context, index) => RemoteDictationView(
                  key: ValueKey(sessions[index].id),
                  sessionId: sessions[index].id,
                ),
              ),
            ),
            if (sessions.length > 1)
              Padding(
                padding: const EdgeInsets.only(bottom: 16, top: 8),
                child: SmoothPageIndicator(
                  controller: _controller,
                  count: sessions.length,
                  effect: WormEffect(
                    dotHeight: 8,
                    dotWidth: 8,
                    spacing: 8,
                    dotColor: theme.colorScheme.onSurface.withValues(
                      alpha: 0.2,
                    ),
                    activeDotColor: theme.colorScheme.primary,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
