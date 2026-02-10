import 'package:app/widgets/history/history_page.dart';
import 'package:flutter/material.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ListTile(
        leading: const Icon(Icons.history),
        title: const Text('History'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const HistoryPage()),
          );
        },
      ),
    );
  }
}
