import type { IHttpClient } from '@aurelia/fetch-client';
import { eventEmitter } from '../event-emitter.js';

export class HttpClientService {
    private static readonly returnUrlStorageKey = 'aurelia2.returnUrl';
    public static xsrfToken: string | null = null;
    private static xsrfTokenPromise: Promise<void> | null = null;
    private static unauthorizedHandled = false;
    private static readonly configuredClients = new WeakSet<IHttpClient>();

    public static configure(httpClient: IHttpClient): void {
        if (HttpClientService.configuredClients.has(httpClient)) {
            return;
        }

        httpClient.configure(config => {
            config.withInterceptor({
                async request(request) {
                    if (HttpClientService.shouldAttachXsrfToken(request)) {
                        await HttpClientService.ensureXsrfToken();
                        if (HttpClientService.xsrfToken) {
                            request.headers.set('X-XSRF-TOKEN', HttpClientService.xsrfToken);
                        }
                    }

                    return request;
                },
                async response(response) {
                    if (response.status === 401 && !HttpClientService.unauthorizedHandled) {
                        HttpClientService.unauthorizedHandled = true;
                        eventEmitter.emit('resetLoginStatus');
                        eventEmitter.emit('unauthorized');
                    }

                    return response;
                }
            });
        });

        HttpClientService.configuredClients.add(httpClient);
    }

    public static async ensureXsrfToken(): Promise<void> {
        if (HttpClientService.xsrfToken) {
            return;
        }

        if (HttpClientService.xsrfTokenPromise === null) {
            HttpClientService.xsrfTokenPromise = (async () => {
                const response = await fetch('/api/account/antiforgery-token', {
                    method: 'GET',
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json() as { token?: string };
                    if (data.token) {
                        HttpClientService.xsrfToken = data.token;
                    }
                }

                HttpClientService.xsrfTokenPromise = null;
            })();
        }

        await HttpClientService.xsrfTokenPromise;
    }

    public static async refreshXsrfToken(): Promise<void> {
        HttpClientService.xsrfToken = null;
        await HttpClientService.ensureXsrfToken();
    }

    public static resetUnauthorizedHandling(): void {
        HttpClientService.unauthorizedHandled = false;
    }

    public static storeReturnUrl(returnUrl: string): void {
        sessionStorage.setItem(HttpClientService.returnUrlStorageKey, returnUrl);
    }

    public static consumeReturnUrl(): string | null {
        const returnUrl = sessionStorage.getItem(HttpClientService.returnUrlStorageKey);
        if (returnUrl !== null) {
            sessionStorage.removeItem(HttpClientService.returnUrlStorageKey);
        }

        return returnUrl;
    }

    public static peekReturnUrl(): string | null {
        return sessionStorage.getItem(HttpClientService.returnUrlStorageKey);
    }

    private static shouldAttachXsrfToken(request: Request): boolean {
        const method = request.method.toUpperCase();
        return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && method !== 'TRACE';
    }
}
