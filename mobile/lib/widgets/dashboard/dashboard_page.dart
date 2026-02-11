import 'package:app/widgets/common/app_animated_shared_axis.dart';
import 'package:app/widgets/dictionary/dictionary_page.dart';
import 'package:app/widgets/home/home_page.dart';
import 'package:app/widgets/settings/settings_page.dart';
import 'package:app/widgets/styles/styles_page.dart';
import 'package:flutter/material.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  int _selectedIndex = 0;
  int _previousIndex = 0;

  static const _pages = <Widget>[
    HomePage(key: Key('home')),
    DictionaryPage(key: Key('dictionary')),
    StylesPage(key: Key('styles')),
    SettingsPage(key: Key('settings')),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppAnimatedSharedAxis(
        reverse: _previousIndex > _selectedIndex,
        child: _pages[_selectedIndex],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() {
            _previousIndex = _selectedIndex;
            _selectedIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.book_outlined),
            selectedIcon: Icon(Icons.book),
            label: 'Dictionary',
          ),
          NavigationDestination(
            icon: Icon(Icons.palette_outlined),
            selectedIcon: Icon(Icons.palette),
            label: 'Styles',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}
