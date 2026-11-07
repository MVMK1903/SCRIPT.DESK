'use strict';
// Settings shared by every ScriptDesk server function.
const { defineSecret } = require('firebase-functions/params');

module.exports = {
  OPTS: { region: 'asia-south1', maxInstances: 10 },
  GMAIL_USER: defineSecret('GMAIL_USER'),
  GMAIL_APP_PASSWORD: defineSecret('GMAIL_APP_PASSWORD')
};
