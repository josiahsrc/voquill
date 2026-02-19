import 'package:app/utils/env_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:mixpanel_flutter/mixpanel_flutter.dart';

final _logger = createNamedLogger('analytics');

Mixpanel? _instance;

Mixpanel? get mixpanel => _instance;

Future<void> initializeMixpanel() async {
  final token = mixpanelToken;
  if (token.isEmpty) {
    _logger.w('Mixpanel token not set, skipping initialization');
    return;
  }

  _instance = await Mixpanel.init(token, trackAutomaticEvents: false);
  _logger.i('Mixpanel initialized');
}
