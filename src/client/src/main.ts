import { HttpClient, IHttpClient } from '@aurelia/fetch-client';
import { RouterConfiguration } from '@aurelia/router';
import fontawesome from '@fortawesome/fontawesome-free/css/all.css?inline';
import Aurelia, { Registration, StyleConfiguration } from 'aurelia';
import bootstrap from 'bootstrap/dist/css/bootstrap.css?inline';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'; // Import Bootstrap JavaScript
import { App } from './app.js';
import { HttpClientService } from './http-client/http-client-service.js';

// Convert the CSS string to CSSStyleSheet
const sheet = new CSSStyleSheet();
sheet.replaceSync(bootstrap);
sheet.replaceSync(fontawesome);

const au = new Aurelia();

au.register(
    Registration.singleton(IHttpClient, HttpClient),
    RouterConfiguration.customize({ useUrlFragmentHash: false }),
    StyleConfiguration.shadowDOM({
        // optionally add the shared styles for all components
        sharedStyles: [sheet]
    })
);

const httpClient = au.container.get(IHttpClient);
HttpClientService.configure(httpClient);

void au
    .app(App)
    .start();
