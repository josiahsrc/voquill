import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_list_tile.dart';
import 'package:app/widgets/common/app_sliver_app_bar.dart';
import 'package:app/widgets/common/list_tile_section.dart';
import 'package:flutter/material.dart';

class DangerZonePage extends StatelessWidget {
  const DangerZonePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          ...const AppSliverAppBar(
            title: Text('Danger Zone'),
            subtitle: Text(
              'These actions have permanent consequences and cannot be undone.',
            ),
          ).buildSlivers(context),
          SliverToBoxAdapter(
            child: Padding(
              padding: Theming.padding.onlyHorizontal(),
              child: ListTileSection(
                children: [
                  AppListTile(
                    leading: const Icon(Icons.person_remove_outlined),
                    title: const Text('Delete account'),
                    variant: AppListTileVariant.warning,
                    onTap: () {},
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
