import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { certFilePath, keyFilePath } from './aspnetcore-https';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import aurelia from '@aurelia/vite-plugin';

export default defineConfig({
    server: {
        https: {
            key: readFileSync(keyFilePath),
            cert: readFileSync(certFilePath)
        },
        port: 5002,
        strictPort: true,
        proxy: {
            '/api': {
                target: 'https://localhost:5001/',
                changeOrigin: true,
                secure: false
            }
        },
        fs: {
            allow: ['..']
        }
    },
    plugins: [
        aurelia({
            useDev: true,
        }),
        nodePolyfills()
    ],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: 'src/main.ts', // Ensure the entry point is set to your main TypeScript file
            output: {
                entryFileNames: 'dist/[name].js',
                chunkFileNames: 'dist/[name].js',
                assetFileNames: 'dist/[name].[ext]'
            }
        }
    },
    publicDir: 'public'
});


