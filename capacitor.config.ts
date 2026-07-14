import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.valdecor.gestao',
  appName: 'Val Decor Gestão',
  webDir: 'dist/public',
  server: {
    url: 'https://valdecoracoes.com',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
