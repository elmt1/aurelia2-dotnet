import { HttpClient, IHttpClient } from '@aurelia/fetch-client';
import { RouterConfiguration } from '@aurelia/router';
import fontawesome from '@fortawesome/fontawesome-free/css/all.css?inline';
import Aurelia, { Registration, StyleConfiguration } from 'aurelia';
import { TurnstileConfiguration } from 'aurelia2-turnstile';
import bootstrap from 'bootstrap/dist/css/bootstrap.css?inline';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { App } from './app.js';
import { HttpClientService } from './http-client/http-client-service.js';

const sheet = new CSSStyleSheet();
sheet.replaceSync(bootstrap);
sheet.replaceSync(fontawesome);

const au = new Aurelia();

au.register(
    Registration.singleton(IHttpClient, HttpClient),
    RouterConfiguration.customize({ useUrlFragmentHash: false }),
    TurnstileConfiguration.configure({
        sitekey: '1x00000000000000000000AA',
    }),
    StyleConfiguration.shadowDOM({
        sharedStyles: [sheet]
    })
);

const httpClient = au.container.get(IHttpClient);
HttpClientService.configure(httpClient);

void au
    .app(App)
    .start();
