import { HttpClient, IHttpClient } from '@aurelia/fetch-client';
import { RouterConfiguration } from '@aurelia/router';
import fontawesome from '@fortawesome/fontawesome-free/css/all.css?inline';
import { Aurelia, Registration, StyleConfiguration } from 'aurelia';
import { AureliaTableConfiguration } from 'aurelia2-table';
import { TurnstileConfiguration } from 'aurelia2-turnstile';
import bootstrap from 'bootstrap/dist/css/bootstrap.css?inline';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { App } from './app.js';

const sheet = new CSSStyleSheet();
sheet.replaceSync(bootstrap);
sheet.replaceSync(fontawesome);

const host = document.querySelector<HTMLElement>('app');
if (host === null) {
    throw new Error('App host element not found.');
}

const app = Aurelia
    .register(
        Registration.singleton(IHttpClient, HttpClient),
        RouterConfiguration.customize({ useUrlFragmentHash: false }),
        AureliaTableConfiguration,
        TurnstileConfiguration.configure({
            sitekey: '1x00000000000000000000AA',
        }),
        StyleConfiguration.shadowDOM({
            sharedStyles: [sheet]
        })
    )
    .app({ host, component: App });

void (app as { start(): void }).start();
