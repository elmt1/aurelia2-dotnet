import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { certFilePath, keyFilePath } from './aspnetcore-https';
import aurelia from '@aurelia/vite-plugin';
import babel from '@rolldown/plugin-babel';

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
        },
        sourcemapIgnoreList: false
    },
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
        babel({
            plugins: [
                ['@babel/plugin-proposal-decorators', { version: '2023-11' }]
            ]
        }),
    ],
    publicDir: 'public'
});