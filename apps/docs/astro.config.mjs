// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Voquill Docs',
			logo: {
				src: './src/assets/icon.svg',
			},
			customCss: ['./src/styles/custom.css'],
			sidebar: [
				{ label: 'Getting Started', slug: 'getting-started' },
				{
					label: 'Guides',
					autogenerate: { directory: 'guides' },
				},
				{
					label: 'Enterprise',
					items: [
						{ label: 'Overview', slug: 'enterprise/overview' },
						{
							label: 'Managed Cloud',
							collapsed: true,
							items: [
								{ label: 'Setup', slug: 'enterprise/managed-cloud/setup' },
								{ label: 'Renewal', slug: 'enterprise/managed-cloud/renewal' },
							],
						},
						{
							label: 'Self-Hosted Cloud',
							collapsed: true,
							items: [
								{ label: 'Setup', slug: 'enterprise/self-hosted-cloud/setup' },
							],
						},
						{
							label: 'On-Premise',
							collapsed: true,
							items: [
								{ label: 'Setup', slug: 'enterprise/on-premise/setup' },
								{ label: 'Local Transcription', slug: 'enterprise/on-premise/transcription' },
								{ label: 'Local Post-Processing', slug: 'enterprise/on-premise/post-processing' },
								{ label: 'Updates & Renewal', slug: 'enterprise/on-premise/renewal' },
							],
						},
					],
				},
			],
		}),
	],
});
