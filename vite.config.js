import {defineConfig} from 'vite';

export default defineConfig({
    publicDir: false,
    build: {
        outDir: 'public/',
        emptyOutDir: true,
        target: 'es2020',
        minify: 'terser',
        cssCodeSplit: false,
        rollupOptions: {
            input: '/Assets/main.js',
            output: {
                entryFileNames: 'installer.js',
                chunkFileNames: 'installer-[name].js',
                assetFileNames: 'installer.[ext]'
            }
        }
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true
            }
        }
    }
});
