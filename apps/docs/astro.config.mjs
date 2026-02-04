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
								{ label: 'AWS', slug: 'enterprise/self-hosted-cloud/aws' },
								{ label: 'GCP', slug: 'enterprise/self-hosted-cloud/gcp' },
								{ label: 'Azure', slug: 'enterprise/self-hosted-cloud/azure' },
								{ label: 'Updates & Renewal', slug: 'enterprise/self-hosted-cloud/renewal' },
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
						{
							label: 'Admin Portal',
							collapsed: true,
							items: [
								{ label: 'Overview', slug: 'enterprise/admin-portal/overview' },
								{ label: 'Users', slug: 'enterprise/admin-portal/users' },
								{ label: 'Global Dictionary', slug: 'enterprise/admin-portal/global-dictionary' },
							  { label: 'Global Styles', slug: 'enterprise/admin-portal/global-styles' },
								{ label: 'Transcription & AI Providers', slug: 'enterprise/admin-portal/transcription-providers' },
								{ label: 'Settings', slug: 'enterprise/admin-portal/settings' },
							],
						},
						{
							label: 'Deployment',
							collapsed: true,
							items: [
								{ label: 'Microsoft Intune', slug: 'enterprise/deployment/intune' },
							],
						},
					],
				},
			],
		}),
	],
});
