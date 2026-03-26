import { HttpClient, IHttpClient } from '@aurelia/fetch-client';
import Aurelia, { Registration, StyleConfiguration } from 'aurelia';
import { App } from './app';
import { HttpClientService } from './http-client/http-client-service';
import { RouterConfiguration } from '@aurelia/router';
import bootstrap from 'bootstrap/dist/css/bootstrap.css?inline';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'; // Import Bootstrap JavaScript
import fontawesome from '@fortawesome/fontawesome-free/css/all.css?inline';

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
