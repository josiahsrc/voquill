import 'package:app/actions/auth_actions.dart';
import 'package:app/store/store.dart';
import 'package:app/theme/pretty_colors.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/utils/url_utils.dart';
import 'package:app/widgets/common/app_list_tile.dart';
import 'package:app/widgets/common/app_sliver_app_bar.dart';
import 'package:app/widgets/common/list_tile_section.dart';
import 'package:app/widgets/settings/edit_profile_dialog.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final user = useAppStore().select(context, (s) => s.user);
    final auth = useAppStore().select(context, (s) => s.auth);
    final theme = Theme.of(context);

    return CustomScrollView(
      slivers: [
        const AppSliverAppBar(title: Text('Settings')),
        SliverToBoxAdapter(
          child: Padding(
            padding: Theming.padding.onlyHorizontal().withBottom(8),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor:
                      PrettyColors.ordered[(user?.name ?? '?').codeUnits.first %
                          PrettyColors.ordered.length],
                  child: Text(
                    (user?.name ?? '?').characters.first.toUpperCase(),
                    style: theme.textTheme.headlineSmall?.copyWith(
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.name ?? '',
                        style: theme.textTheme.titleMedium,
                      ),
                      if (auth?.email != null)
                        Text(
                          auth!.email!,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurface.withAlpha(153),
                          ),
                        ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () => _showEditProfileDialog(context),
                ),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: Theming.padding.onlyHorizontal().withTop(16),
            child: ListTileSection(
              title: const Text('General'),
              children: [
                AppListTile(
                  leading: const Icon(Icons.mic_outlined),
                  title: const Text('Microphone'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {},
                ),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: Theming.padding.onlyHorizontal().withTop(16),
            child: ListTileSection(
              title: const Text('Processing'),
              children: [
                AppListTile(
                  leading: const Icon(Icons.language),
                  title: const Text('Dictation language'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {},
                ),
                AppListTile(
                  leading: const Icon(Icons.graphic_eq_outlined),
                  title: const Text('AI transcription'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {},
                ),
                AppListTile(
                  leading: const Icon(Icons.auto_fix_high_outlined),
                  title: const Text('AI post processing'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {},
                ),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: Theming.padding.onlyHorizontal().withTop(16),
            child: ListTileSection(
              title: const Text('Advanced'),
              children: [
                AppListTile(
                  leading: const Icon(Icons.payment_outlined),
                  title: const Text('Manage subscription'),
                  trailing: const Icon(Icons.open_in_new, size: 18),
                  onTap: () {},
                ),
                AppListTile(
                  leading: const Icon(Icons.description_outlined),
                  title: const Text('Terms & conditions'),
                  trailing: const Icon(Icons.open_in_new, size: 18),
                  onTap: () => openUrl('https://voquill.com/terms'),
                ),
                AppListTile(
                  leading: const Icon(Icons.privacy_tip_outlined),
                  title: const Text('Privacy policy'),
                  trailing: const Icon(Icons.open_in_new, size: 18),
                  onTap: () => openUrl('https://voquill.com/privacy'),
                ),
                AppListTile(
                  leading: const Icon(Icons.logout_outlined),
                  title: const Text('Sign out'),
                  onTap: () => signOut(),
                ),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: Theming.padding
                .onlyHorizontal()
                .withTop(16)
                .withBottom(32),
            child: ListTileSection(
              children: [
                AppListTile(
                  leading: const Icon(Icons.warning_amber_outlined),
                  title: const Text('Danger Zone'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/dashboard/danger-zone'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showEditProfileDialog(BuildContext context) {
    final user = getAppState().user;
    showDialog(
      context: context,
      builder: (_) => EditProfileDialog(initialName: user?.name),
    );
  }
}
