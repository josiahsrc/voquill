import 'package:app/actions/revenue_cat_actions.dart';
import 'package:app/flavor.dart';
import 'package:app/theme/app_colors.dart';
import 'package:app/utils/color_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/paywall/hero_graphic.dart';
import 'package:flutter/material.dart';
import 'package:gap/gap.dart';
import 'package:url_launcher/url_launcher.dart';

enum _PlanOption { yearly, monthly }

class PaywallPage extends StatefulWidget {
  const PaywallPage({super.key});

  static Future<void> show(BuildContext context) {
    return Navigator.of(context, rootNavigator: true).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => const PaywallPage(),
      ),
    );
  }

  @override
  State<PaywallPage> createState() => _PaywallPageState();
}

class _PaywallPageState extends State<PaywallPage> {
  _PlanOption _selected = _PlanOption.yearly;
  bool _loading = false;

  Future<void> _onContinue() async {
    setState(() => _loading = true);
    try {
      // TODO: purchase the selected package via RevenueCat
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.colors;
    final mq = MediaQuery.of(context);

    return Scaffold(
      backgroundColor: colors.level0,
      body: Column(
        children: [
          Expanded(
            child: CustomScrollView(
              physics: const BouncingScrollPhysics(),
              slivers: [
                SliverAppBar(
                  expandedHeight: mq.padding.top + 90,
                  pinned: false,
                  floating: false,
                  automaticallyImplyLeading: false,
                  stretch: true,
                  backgroundColor: colors.level1,
                  flexibleSpace: FlexibleSpaceBar(
                    stretchModes: const [StretchMode.zoomBackground],
                    background: Container(
                      color: colors.level1,
                      child: const HeroGraphic(),
                    ),
                  ),
                  actions: [
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: IconButton.styleFrom(
                        backgroundColor: colors.level0.withApproxOpacity(0.6),
                      ),
                      icon: const Icon(Icons.close),
                    ),
                    const SizedBox(width: 4),
                  ],
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: Theming.padding,
                    child: Column(
                      children: [
                        const Gap(16),
                        Text(
                          'Unlock everything with',
                          style: theme.textTheme.headlineSmall,
                          textAlign: TextAlign.center,
                        ),
                        Text(
                          'Voquill Pro',
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const Gap(12),
                        Chip(
                          label: Text(
                            'Pro',
                            style: theme.textTheme.labelLarge?.copyWith(
                              color: colors.onBlue,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          backgroundColor: colors.blue,
                          side: BorderSide.none,
                        ),
                        const Gap(24),
                        _FeatureItem(label: 'Unlimited voice transcriptions'),
                        _FeatureItem(label: 'Advanced AI post-processing'),
                        _FeatureItem(label: 'Custom tones and styles'),
                        _FeatureItem(label: 'Priority support'),
                        const Gap(32),
                        Row(
                          children: [
                            Expanded(
                              child: _PlanCard(
                                label: 'Yearly',
                                price: '\$89.99/yr',
                                subtitle: 'Only \$7.50/mo',
                                badgeText: 'SAVE 19%',
                                selected: _selected == _PlanOption.yearly,
                                onTap: () => setState(
                                  () => _selected = _PlanOption.yearly,
                                ),
                              ),
                            ),
                            const Gap(12),
                            Expanded(
                              child: _PlanCard(
                                label: 'Monthly',
                                price: '\$12.99/mo',
                                subtitle: 'Billed at \$12.99/mo.',
                                selected: _selected == _PlanOption.monthly,
                                onTap: () => setState(
                                  () => _selected = _PlanOption.monthly,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const Gap(16),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: Theming.padding.withTop(8),
            child: SafeArea(
              top: false,
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _loading ? null : _onContinue,
                      child: _loading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Continue'),
                    ),
                  ),
                  const Gap(8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _FooterLink(
                        label: 'Restore Purchases',
                        onTap: () => restorePurchases(),
                      ),
                      _FooterLink(
                        label: 'Terms',
                        onTap: () =>
                            launchUrl(Uri.parse(Flavor.current.termsUrl)),
                      ),
                      _FooterLink(
                        label: 'Privacy',
                        onTap: () =>
                            launchUrl(Uri.parse(Flavor.current.privacyUrl)),
                      ),
                    ],
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

class _FooterLink extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _FooterLink({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.colors;

    return TextButton(
      onPressed: onTap,
      style: TextButton.styleFrom(
        minimumSize: Size.zero,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      ),
      child: Text(
        label,
        style: theme.textTheme.bodySmall?.copyWith(
          color: colors.onLevel0.secondary(),
        ),
      ),
    );
  }
}

class _FeatureItem extends StatelessWidget {
  final String label;

  const _FeatureItem({required this.label});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.colors;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(Icons.check_circle, color: colors.blue, size: 22),
          const Gap(12),
          Expanded(child: Text(label, style: theme.textTheme.bodyMedium)),
        ],
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final String label;
  final String price;
  final String subtitle;
  final String? badgeText;
  final bool selected;
  final VoidCallback onTap;

  const _PlanCard({
    required this.label,
    required this.price,
    required this.subtitle,
    this.badgeText,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.colors;
    final borderColor = selected ? colors.blue : colors.level2;

    return GestureDetector(
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(color: borderColor, width: 2),
              borderRadius: BorderRadius.circular(Theming.radiusValue),
              color: colors.level0,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      label,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Icon(
                      selected
                          ? Icons.check_circle
                          : Icons.radio_button_unchecked,
                      color: selected ? colors.blue : colors.level2,
                      size: 22,
                    ),
                  ],
                ),
                const Gap(4),
                Text(
                  price,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const Gap(2),
                Text(
                  subtitle,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colors.onLevel0.secondary(),
                  ),
                ),
              ],
            ),
          ),
          if (badgeText != null)
            Positioned(
              top: -10,
              left: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: colors.blue,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  badgeText!,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colors.onBlue,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
