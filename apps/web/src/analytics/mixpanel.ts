import mixpanel from 'mixpanel-browser';
import { stripLocalePrefix } from '../utils/locale.utils';

const token = import.meta.env.PUBLIC_MIXPANEL_TOKEN;

if (token) {
	mixpanel.init(token, { track_pageview: false, persistence: 'localStorage' });

	const path = stripLocalePrefix(window.location.pathname) || '/';
	mixpanel.track('Page View', { path });

	document.addEventListener('click', (e) => {
		const el = (e.target as HTMLElement).closest<HTMLElement>('[data-track]');
		if (!el) return;
		mixpanel.track('Button Click', { name: el.dataset.track });
	});
}
