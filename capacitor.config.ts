import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.cbad6b835a554c9387494b7f4677f2cf',
  appName: 'Order Manager Pro',
  webDir: 'dist',
  server: {
    url: 'https://cbad6b83-5a55-4c93-8749-4b7f4677f2cf.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    }
  }
};

export default config;