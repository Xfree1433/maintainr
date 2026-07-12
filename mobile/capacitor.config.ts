import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.plainspokenfoundrynine.maintainr',
  appName: 'MAINTAINR',
  // Local assets (loading + offline fallback). The webview immediately
  // navigates to server.url below; www/ is only shown before first load
  // and when the device is offline.
  webDir: 'www',
  server: {
    // Server-rendered Next.js app is loaded live over HTTPS.
    url: 'https://maintainr.plainspokenfoundrynine.com',
    androidScheme: 'https',
    iosScheme: 'https',
    // Keep in-app navigation confined to the MAINTAINR origin. Any other
    // link (external site, mailto, etc.) is handed to the system browser
    // instead of loading inside the app shell.
    allowNavigation: ['maintainr.plainspokenfoundrynine.com'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
