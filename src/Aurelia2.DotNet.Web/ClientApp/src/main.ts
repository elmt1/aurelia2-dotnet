import Aurelia, { StyleConfiguration } from 'aurelia';
import { App } from './app';
import { RouterConfiguration } from '@aurelia/router-lite';
import bootstrap from 'bootstrap/dist/css/bootstrap.css?inline';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'; // Import Bootstrap JavaScript
import fontawesome from '@fortawesome/fontawesome-free/css/all.css?inline';

// Convert the CSS string to CSSStyleSheet
const sheet = new CSSStyleSheet();
sheet.replaceSync(bootstrap);
sheet.replaceSync(fontawesome);

Aurelia
    .register(RouterConfiguration.customize({ useUrlFragmentHash: false }),
        StyleConfiguration.shadowDOM({
            // optionally add the shared styles for all components
            sharedStyles: [sheet]
        })    )
  .app(App)
  .start();
