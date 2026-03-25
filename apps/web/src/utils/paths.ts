function normalizePath(path: string): string {
	if (path === '/' || path === '') {
		return '/';
	}

	const [pathWithQuery, hash = ''] = path.split('#');
	const [rawPath, query = ''] = pathWithQuery.split('?');

	if (!rawPath || rawPath === '/') {
		return `/${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
	}

	const normalizedPath =
		!/\/[^/]+\.[a-z0-9]+$/i.test(rawPath) && !rawPath.endsWith('/')
			? `${rawPath}/`
			: rawPath;

	return `${normalizedPath}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}

export function localePath(lang: string, path: string) {
	const normalizedPath = normalizePath(path);
	return normalizedPath === '/' ? `/${lang}/` : `/${lang}${normalizedPath}`;
}
