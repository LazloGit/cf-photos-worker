import type { UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default {
	plugins: [react()],
	root: './src/client',
	build: {
		outDir: '../../dist',
	},
} satisfies UserConfig;
