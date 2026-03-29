/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_MIXPANEL_TOKEN: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
