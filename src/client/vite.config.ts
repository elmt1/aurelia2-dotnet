import { existsSync, readFileSync } from 'fs';
import aurelia from '@aurelia/vite-plugin';
import babel from '@rolldown/plugin-babel';
import { defineConfig } from 'vite';
import { certFilePath, keyFilePath } from './aspnetcore-https.js';

type HttpsConfig = { key: Buffer; cert: Buffer };

function getHttpsConfig(): HttpsConfig | undefined {
    if (process.env.CI === 'true' || process.env.NODE_ENV === 'production') {
        return undefined;
    }

    if (existsSync(certFilePath) && existsSync(keyFilePath)) {
        return {
            key: readFileSync(keyFilePath),
            cert: readFileSync(certFilePath)
        };
    }

    return undefined;
}

export default defineConfig({
    server: {
        host: true,
        https: getHttpsConfig(),
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