import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

class RouteRefresher extends ChangeNotifier {
  RouteRefresher();

  bool _scheduled = false;

  void refresh() {
    if (_scheduled) return;
    _scheduled = true;
    SchedulerBinding.instance.addPostFrameCallback((_) {
      _scheduled = false;
      notifyListeners();
    });
  }
}
