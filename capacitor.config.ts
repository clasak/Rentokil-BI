/**
 * Capacitor Configuration for Rentokil BI Native App
 *
 * This file configures the native iOS and Android builds.
 * To activate native builds, run:
 *   npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
 *   npx cap add ios
 *   npx cap add android
 *
 * See APP_STORE_INFO.md for full deployment instructions.
 */

// Note: CapacitorConfig type will be available after installing @capacitor/cli
// import type { CapacitorConfig } from '@capacitor/cli';

interface CapacitorConfig {
  appId: string
  appName: string
  webDir: string
  server?: {
    androidScheme?: string
    iosScheme?: string
  }
  plugins?: Record<string, unknown>
  ios?: Record<string, unknown>
  android?: Record<string, unknown>
}

const config: CapacitorConfig = {
  appId: 'com.rentokil.bi',
  appName: 'Rentokil BI',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#E4002B',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#E4002B',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
  ios: {
    scheme: 'Rentokil BI',
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
