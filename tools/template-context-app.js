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
  
  // The client also expects these at the root level for legacy compatibility
  result.apiUrl = settings.apiUrl;
  result.authDomain = settings.authDomain;

  // Configure the Hypothesis client with service endpoints
  // See: https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-services
  const serviceConfig = {
    apiUrl: settings.apiUrl,
    authority: settings.authDomain,
  };
  
  // If grantToken is provided, use it to skip OAuth and pre-authorize the client
  if (settings.grantToken) {
    serviceConfig.grantToken = settings.grantToken;
  }
  
  result.services = [serviceConfig];

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
