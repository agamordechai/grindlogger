import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grindlogger.app',
  appName: 'GrindLogger',
  webDir: 'dist',
  plugins: {
    // Route fetch/XHR through native networking. This sidesteps browser CORS for
    // the direct Anthropic API call and for the LAN OTA update server on the Mac.
    CapacitorHttp: { enabled: true },
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
    },
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
