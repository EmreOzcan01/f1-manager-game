import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'F1 Manager — Build Your Racing Empire',
    short_name: 'F1 Manager',
    description: 'Manage your own Formula 1 team. Develop your car, sign drivers, set race strategies, and compete for the championship.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#e11d48',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
