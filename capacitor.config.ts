import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android app shell (Capacitor). The app is the same static build as the website, bundled into
 * the APK so it works offline from the first launch. See docs/ANDROID.md.
 */
const config: CapacitorConfig = {
  // Change before publishing to Google Play: the id must be unique and cannot change afterwards.
  appId: 'com.netcbt.simulator',
  appName: 'NET CBT Simulator',
  webDir: 'dist',
  backgroundColor: '#0a5d91',
  android: {
    // Android 15+ draws apps edge to edge; keep the page clear of the status and navigation bars.
    adjustMarginsForEdgeToEdge: 'auto',
  },
  plugins: {
    StatusBar: {
      backgroundColor: '#0a5d91',
      style: 'DARK',
      overlaysWebView: false,
    },
  },
};

export default config;
