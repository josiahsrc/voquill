import 'dart:async';

import 'package:app/actions/app_actions.dart';
import 'package:app/flavor.dart';
import 'package:app/model/tone_model.dart';
import 'package:app/routing/build_router.dart';
import 'package:app/routing/route_refresher.dart';
import 'package:app/state/snackbar_state.dart';
import 'package:app/store/store.dart';
import 'package:app/theme/app_colors.dart';
import 'package:app/theme/build_theme.dart';
import 'package:app/utils/channel_utils.dart';
import 'package:app/utils/tone_utils.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

class Root extends StatelessWidget {
  const Root({super.key});

  @override
  Widget build(BuildContext context) {
    return StoreScope(
      child: ChangeNotifierProvider(
        create: (context) => RouteRefresher(),
        child: const App(),
      ),
    );
  }
}

class App extends StatefulWidget {
  const App({super.key});

  @override
  State<App> createState() => _AppState();
}

class _AppState extends State<App> {
  final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();
  late final GoRouter goRouter;
  late final StreamSubscription _authSubscription;

  @override
  void initState() {
    super.initState();
    goRouter = buildRouter(refreshListenable: context.read<RouteRefresher>());
    _authSubscription = listenToAuthChanges();
  }

  @override
  void dispose() {
    _authSubscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Widget app = MaterialApp.router(
      theme: buildLightTheme(),
      darkTheme: buildDarkTheme(),
      themeMode: ThemeMode.system,
      routerConfig: goRouter,
      scaffoldMessengerKey: scaffoldMessengerKey,
    );

    final color = Flavor.current.color;
    if (color != null) {
      app = Directionality(
        textDirection: TextDirection.ltr,
        child: Banner(
          message: Flavor.current.shortName,
          location: BannerLocation.topStart,
          color: color,
          child: app,
        ),
      );
    }

    return StoreListener([
      useAppStore().listen(
        (context, state) {
          context.read<RouteRefresher>().refresh();
        },
        condition: (a, b) =>
            a.status != b.status ||
            a.auth != b.auth ||
            a.isOnboarded != b.isOnboarded,
      ),
      useAppStore().listen(
        (context, state) {
          final selectedToneId = getManuallySelectedToneId(state);
          final activeToneIds = getActiveManualToneIds(state);
          final toneById = <String, SharedTone>{};
          for (final entry in state.toneById.entries) {
            toneById[entry.key] = SharedTone(
              name: entry.value.name,
              promptTemplate: entry.value.promptTemplate,
            );
          }
          syncKeyboardTones(
            selectedToneId: selectedToneId,
            activeToneIds: activeToneIds,
            toneById: toneById,
          );
        },
        condition: (a, b) =>
            a.user?.selectedToneId != b.user?.selectedToneId ||
            a.user?.activeToneIds != b.user?.activeToneIds ||
            a.toneById != b.toneById,
      ),
      useAppStore().listen((context, state) {
        if (state.snackbar.counter > 0) {
          final snackContext = scaffoldMessengerKey.currentContext;
          scaffoldMessengerKey.currentState?.showSnackBar(
            SnackBar(
              content: Text(state.snackbar.message, maxLines: 5),
              showCloseIcon: true,
              duration: state.snackbar.duration,
              backgroundColor: state.snackbar.type == SnackbarType.error
                  ? snackContext?.colors.error
                  : null,
            ),
          );
        }
      }, condition: (a, b) => a.snackbar.counter != b.snackbar.counter),
    ], child: app);
  }
}
