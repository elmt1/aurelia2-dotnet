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
    // Remove deprecation warnings related to Bootstrap sass saying that the @import 
    // rule in Sass that is deprecated and will be removed in Dart Sass 3.0.0
    css: {
        preprocessorOptions: {
            scss: {
                quietDeps: true
            }
        }
    },
    plugins: [
        aurelia({
            useDev: true,
        }),
        nodePolyfills()
    ],
    publicDir: 'public'
});


