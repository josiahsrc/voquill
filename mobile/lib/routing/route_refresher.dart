import 'package:flutter/material.dart';

class RouteRefresher extends ChangeNotifier {
  RouteRefresher();

  void refresh() {
    notifyListeners();
  }
}
