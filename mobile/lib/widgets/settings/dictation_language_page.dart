import 'package:app/actions/language_actions.dart';
import 'package:app/actions/snackbar_actions.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/language_utils.dart';
import 'package:app/widgets/common/app_checkbox_list_tile.dart';
import 'package:app/widgets/common/app_sliver_app_bar.dart';
import 'package:flutter/material.dart';

class DictationLanguagePage extends StatefulWidget {
  const DictationLanguagePage({super.key});

  @override
  State<DictationLanguagePage> createState() => _DictationLanguagePageState();
}

class _DictationLanguagePageState extends State<DictationLanguagePage> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final store = useAppStore();
    final selectedLanguages = store.select(
      context,
      (s) => s.dictationLanguages,
    );

    final selectedCodes = <String>[];
    final unselectedCodes = <String>[];
    for (final code in orderedDictationLanguageCodes) {
      if (selectedLanguages.contains(code)) {
        selectedCodes.add(code);
      } else {
        unselectedCodes.add(code);
      }
    }

    selectedCodes.sort(
      (a, b) =>
          selectedLanguages.indexOf(a).compareTo(selectedLanguages.indexOf(b)),
    );

    final allCodes = [...selectedCodes, ...unselectedCodes];

    final filteredCodes = _search.isEmpty
        ? allCodes
        : allCodes.where((code) {
            final name = getDisplayNameForLanguage(code).toLowerCase();
            final query = _search.toLowerCase();
            return name.contains(query) || code.toLowerCase().contains(query);
          }).toList();

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          ...const AppSliverAppBar(
            title: Text('Dictation languages'),
            subtitle: Text(
              'Select the languages you dictate in. Tap the language chip on the keyboard to cycle between them.',
            ),
          ).buildSlivers(context),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: TextField(
                decoration: const InputDecoration(
                  hintText: 'Search languages',
                  prefixIcon: Icon(Icons.search),
                  border: OutlineInputBorder(),
                ),
                onChanged: (value) => setState(() => _search = value),
              ),
            ),
          ),
          SliverList.builder(
            itemCount: filteredCodes.length,
            itemBuilder: (context, index) {
              final code = filteredCodes[index];
              final isSelected = selectedLanguages.contains(code);
              return AppCheckboxListTile(
                value: isSelected,
                onChanged: (_) {
                  if (isSelected && selectedLanguages.length <= 1) {
                    showSnackbar('At least one language must be selected');
                    return;
                  }
                  final updated = isSelected
                      ? selectedLanguages.where((c) => c != code).toList()
                      : [...selectedLanguages, code];
                  setDictationLanguages(updated);
                },
                title: Text(getDisplayNameForLanguage(code)),
                subtitle: Text(code),
              );
            },
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }
}
