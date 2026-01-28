import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'split_bar_editor.dart';

class CurrencySplitterCategory {
  final String id;
  final String name;
  final Color color;
  final double weight;

  const CurrencySplitterCategory({
    required this.id,
    required this.name,
    required this.color,
    required this.weight,
  });
}

class CategoryRow extends StatelessWidget {
  const CategoryRow({
    super.key,
    required this.name,
    required this.color,
    required this.amount,
  });

  final String name;
  final Color color;
  final double amount;

  @override
  Widget build(BuildContext context) {
    final formatter = NumberFormat.currency(symbol: '\$', decimalDigits: 0);
    final formatted = formatter.format(amount);
    final theme = Theme.of(context);

    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        SizedBox(width: Theming.paddingValue),
        Expanded(child: Text(name, textAlign: TextAlign.left)),
        Text(formatted, style: theme.textTheme.bodyMedium),
      ],
    );
  }
}

class CurrencySplitter extends StatelessWidget {
  const CurrencySplitter({
    super.key,
    required this.total,
    required this.categories,
    this.onChange,
  });

  final double total;
  final List<CurrencySplitterCategory> categories;
  final ValueChanged<List<double>>? onChange;

  @override
  Widget build(BuildContext context) {
    final totalWeight = categories.fold<double>(
      0,
      (sum, cat) => sum + cat.weight,
    );

    return Column(
      children: [
        for (int i = 0; i < categories.length; i++) ...[
          CategoryRow(
            name: categories[i].name,
            color: categories[i].color,
            amount: (categories[i].weight / totalWeight) * total,
          ),
          if (i < categories.length - 1) SizedBox(height: Theming.paddingValue),
        ],
        SizedBox(height: Theming.paddingValue),
        SizedBox(
          height: 64,
          child: SplitBarEditor(
            onChanged: onChange,
            segments: categories
                .map(
                  (cat) => SplitBarSegment(color: cat.color, value: cat.weight),
                )
                .toList(),
          ),
        ),
      ],
    );
  }
}
