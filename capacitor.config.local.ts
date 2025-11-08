import { CapacitorConfig } from '@capacitor/cli';

// Configuration for local server deployment
// Copy this file to capacitor.config.ts and update the server URL
// with your local server's IP address before building the Android APK

const config: CapacitorConfig = {
  appId: 'app.lovable.cbad6b835a554c9387494b7f4677f2cf',
  appName: 'Order Manager Pro',
  webDir: 'dist',
  server: {
    // IMPORTANT: Replace with your local server's IP address
    // Examples:
    // - Local network: 'http://192.168.1.100'
    // - VPN: 'http://10.8.0.1'
    // - Public domain: 'https://yourdomain.com'
    url: 'http://YOUR_SERVER_IP',
    cleartext: true  // Set to false if using HTTPS
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    }
  }
};

export default config;
