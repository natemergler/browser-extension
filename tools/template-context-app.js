#!/usr/bin/env node

/**
 * Outputs a JSON object representing the appropriate template context for the
 * `app.html` file.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

function appSettings(settings) {
  const result = {};
  result.assetRoot = '/client/';
  result.release = settings.version;
  result.appType = settings.appType || '';

  // Configure the Hypothesis client with service endpoints
  // See: https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-services
  result.services = [{
    apiUrl: settings.apiUrl,
    authority: settings.authDomain,
    // Optional: grantToken for pre-authenticated requests (not used here for localhost dev)
  }];

  if (settings.sentryPublicDSN) {
    result.raven = {
      dsn: settings.sentryPublicDSN,
      release: settings.version,
    };
  }

  if (settings.oauthClientId) {
    result.oauthClientId = settings.oauthClientId;
  }

  return result;
}

if (process.argv.length !== 3) {
  console.error('Usage: %s <settings.json>', path.basename(process.argv[1]));
  process.exit(1);
}

const settings = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), process.argv[2])),
);

console.log(
  JSON.stringify({
    settings: JSON.stringify(appSettings(settings)),
  }),
);
