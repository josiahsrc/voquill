import 'package:animations/animations.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

class MultiPageController extends ChangeNotifier {
  MultiPageController({String? target}) : _initialTarget = target;

  final String? _initialTarget;
  String? _target;
  late List<String> _targets;
  final List<String> _history = [];
  bool _didPush = false;

  static MultiPageController fromPage<T extends Widget>() {
    return MultiPageController(target: targetFromPage<T>());
  }

  bool get canPop => _history.isNotEmpty;
  String get target => _target ?? _initialTarget ?? _targets.first;
  List<String> get targets => _targets;
  bool get isAtEnd => index == targets.length - 1;
  bool get isAtStart => index == 0;
  int get index => _targets.indexOf(target);
  bool get didPop => !_didPush;
  bool get didPush => _didPush;

  void pop() {
    if (!canPop) return;
    final prev = _history.removeLast();
    _target = prev;
    _didPush = false;
    notifyListeners();
  }

  void pushNext({int skip = 0}) {
    if (isAtEnd) return;
    if (index + skip >= targets.length) {
      pushTarget(_targets.last);
    } else {
      pushTarget(_targets[index + skip + 1]);
    }
  }

  void pushTarget(String value) {
    _history.add(target);
    _target = value;
    _didPush = true;
    notifyListeners();
  }

  void pushPage<T extends Widget>() {
    pushTarget(targetFromPage<T>());
  }
}

class MultiPageItem {
  const MultiPageItem({required this.page, required this.target});

  static MultiPageItem fromPage<T extends Widget>(T page) {
    return MultiPageItem(page: page, target: targetFromPage<T>());
  }

  final Widget page;
  final String target;
}

String targetFromPage<T extends Widget>() {
  return T.toString();
}

class MultiPagePresenter extends StatefulWidget {
  MultiPagePresenter({
    super.key,
    required this.controller,
    required this.items,
    this.backgroundColor,
  }) {
    controller._targets = targets;
  }

  final MultiPageController controller;
  final List<MultiPageItem> items;
  final Color? backgroundColor;

  List<String> get targets => items.map((e) => e.target).toList();

  @override
  State<MultiPagePresenter> createState() => _MultiPagePresenterState();

  static MultiPageController of(BuildContext context, {bool listen = true}) {
    return Provider.of<MultiPageController>(context, listen: listen);
  }
}

extension BuildContextMultiPageControllerX on BuildContext {
  MultiPageController presenter([bool listen = false]) {
    return MultiPagePresenter.of(this, listen: listen);
  }
}

class _MultiPagePresenterState extends State<MultiPagePresenter> {
  MultiPageController get ctrl => widget.controller;

  @override
  void initState() {
    ctrl._targets = widget.targets;
    ctrl.addListener(_onControllerChanged);
    super.initState();
  }

  @override
  void dispose() {
    ctrl.removeListener(_onControllerChanged);
    super.dispose();
  }

  void _onControllerChanged() {
    setState(() {});
  }

  @override
  void didUpdateWidget(covariant MultiPagePresenter oldWidget) {
    if (widget.controller != oldWidget.controller) {
      oldWidget.controller.removeListener(_onControllerChanged);
      widget.controller.addListener(_onControllerChanged);
    }
    ctrl._targets = widget.targets;
    super.didUpdateWidget(oldWidget);
  }

  @override
  Widget build(BuildContext context) {
    final eIndex = ctrl.index.clamp(0, widget.items.length - 1);
    final current = widget.items[eIndex];
    final theme = Theme.of(context);
    final bgColor = widget.backgroundColor ?? theme.scaffoldBackgroundColor;

    final page = PageTransitionSwitcher(
      reverse: !ctrl._didPush,
      duration: const Duration(milliseconds: 250),
      transitionBuilder:
          (
            Widget child,
            Animation<double> animation,
            Animation<double> secondaryAnimation,
          ) {
            return SharedAxisTransition(
              fillColor: widget.backgroundColor,
              animation: animation,
              secondaryAnimation: secondaryAnimation,
              transitionType: SharedAxisTransitionType.horizontal,
              child: child,
            );
          },
      child: Scaffold(
        key: ValueKey('multi-page-${ctrl.target}-${ctrl.index}'),
        backgroundColor: bgColor,
        body: current.page,
      ),
    );

    return ChangeNotifierProvider.value(value: ctrl, child: page);
  }
}

class MultiPageBackButton extends StatelessWidget {
  const MultiPageBackButton({super.key});

  @override
  Widget build(BuildContext context) {
    return BackButton(
      onPressed: () {
        final presenter = context.presenter();
        if (presenter.canPop) {
          presenter.pop();
        } else {
          context.pop();
        }
      },
    );
  }
}
