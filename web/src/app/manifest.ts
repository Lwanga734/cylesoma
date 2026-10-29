import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CyleSoma',
    short_name: 'CyleSoma',
    description: 'Simplifying School Management. Empowering Education.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#053065',
    icons: [
      { src: '/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
