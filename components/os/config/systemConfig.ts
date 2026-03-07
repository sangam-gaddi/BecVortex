"use client";
export const DEFAULT_SYSTEM_MEMORY_GB = 2;

export const BRAND = {
  // Default accent color
  accentColor: '#5755e4',

  // User-selectable accent colors
  accentPalette: [
    { name: 'Rose', value: '#e11d48' },     // Rose-600 (Vibrant Red)
    { name: 'BEC Orange', value: '#fe5000' }, // BEC Studio Orange
    { name: 'Amber', value: '#f59e0b' },    // Amber-500 (Warm Gold)
    { name: 'Emerald', value: '#10b981' },  // Emerald-500 (Crisp Green)
    { name: 'Blue', value: '#3b82f6' },     // Blue-500 (Classic Tech Blue)
    { name: 'Indigo', value: '#5755e4' },   // Indigo-500 (Deep Modern Blue)
    { name: 'Violet', value: '#8b5cf6' },   // Violet-500 (Bright Purple)
    { name: 'BEC VORTEX OS Fuchsia', value: '#d453f6' }, // BEC VORTEX OS Fuchsia
  ],

  // Desktop wallpapers
  wallpapers: [
    { id: 'default', name: 'Tahoe', src: '/os-assets/images/wallpaper-tahoe.jpg' },
    { id: 'nebula', name: 'Nebula', src: '/os-assets/images/wallpaper-nebula.avif' },
    { id: 'city', name: 'City', src: '/os-assets/images/wallpaper-city.avif' },
    { id: 'aurora', name: 'Aurora', src: '/os-assets/images/wallpaper-aurora.avif' },
    { id: 'lake', name: 'Lake', src: '/os-assets/images/wallpaper-lake.avif' },
    { id: 'bigsur', name: 'Big Sur', src: '/os-assets/images/wallpaper-bigsur.jpg' },
    { id: 'bec', name: 'BEC Vortex', src: '/os-assets/images/wallpaper-bec.png' },
  ],
} as const;

// Type exports for consumers
export type AccentColor = (typeof BRAND.accentPalette)[number];
export type Wallpaper = (typeof BRAND.wallpapers)[number];

// Keys in SystemConfig that should survive a "New Game" reset (BIOS settings)
export const PERSISTENT_CONFIG_KEYS = [
  'locale',
  'gpuEnabled',
  'blurEnabled',
  'reduceMotion',
  'disableShadows',
  'disableGradients'
] as const;
