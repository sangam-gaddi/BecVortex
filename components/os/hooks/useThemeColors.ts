"use client";
import { useAppContext } from '@/components/os/components/AppContext';
import { getComplementaryColor, mixColors } from '@/components/os/utils/colors';

/**
 * Custom hook to get theme-aware colors based on accent color, theme mode, and color scheme
 */
export function useThemeColors() {
    const { accentColor, themeMode, blurEnabled, colorScheme } = useAppContext();

    const isLight = colorScheme === 'light';

    // Light theme base colors (warm white/cream/grey)
    const LIGHT_BASE = '#F8F7F4';          // Warm off-white (desktop/window bg)
    const LIGHT_SIDEBAR = '#EDEAE4';       // Warm light grey (sidebar)
    const LIGHT_TITLEBAR = '#E8E5DF';      // Slightly darker titlebars
    const LIGHT_DOCK = '#F2F0EA';          // Dock base

    // True neutral dark gray (replacing blue-tinted slate-900)
    const NEUTRAL_BASE = '#171717'; // Neutral-900 equivalent

    /**
     * Get the base tint color for the current mode (dark only)
     */
    const getBaseTintColor = (): string => {
        switch (themeMode) {
            case 'shades':
                return mixColors(NEUTRAL_BASE, accentColor, 0.15); // Subtle 15% tint
            case 'contrast': {
                const complement = getComplementaryColor(accentColor);
                return mixColors(NEUTRAL_BASE, complement, 0.15); // Subtle 15% tint
            }
            case 'neutral':
            default:
                return NEUTRAL_BASE;
        }
    };

    /**
     * Get light mode tint color — accent tints into cream/white
     */
    const getLightTintColor = (): string => {
        switch (themeMode) {
            case 'shades':
                return mixColors(LIGHT_BASE, accentColor, 0.08); // Very subtle 8% accent tint into cream
            case 'contrast': {
                const complement = getComplementaryColor(accentColor);
                return mixColors(LIGHT_BASE, complement, 0.06);
            }
            case 'neutral':
            default:
                return LIGHT_BASE;
        }
    };

    /**
     * Helper to apply opacity to a hex color
     * If blur is disabled, forces 100% opacity (no transparency)
     */
    const withOpacity = (hex: string, opacity: number): string => {
        // If blur is disabled, use 100% opacity (FF)
        if (!blurEnabled) {
            return `${hex}FF`;
        }
        const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
        return `${hex}${alpha}`;
    };

    if (isLight) {
        const lightBase = getLightTintColor();
        // For light mode, use solid or near-solid surfaces with warm tones
        const lightWindow   = blurEnabled ? `${lightBase}D6` : `${lightBase}FF`; // ~84% opacity
        const lightSidebar  = blurEnabled ? `${LIGHT_SIDEBAR}E8` : `${LIGHT_SIDEBAR}FF`; // ~91%
        const lightTitlebar = blurEnabled ? `${LIGHT_TITLEBAR}F5` : `${LIGHT_TITLEBAR}FF`; // ~96%
        const lightDock     = blurEnabled ? `${LIGHT_DOCK}CC` : `${LIGHT_DOCK}FF`; // ~80%
        const lightMenuBar  = blurEnabled ? `${LIGHT_TITLEBAR}F0` : `${LIGHT_TITLEBAR}FF`; // ~94%
        const lightNotif    = blurEnabled ? `${LIGHT_SIDEBAR}E0` : `${LIGHT_SIDEBAR}FF`; // ~88%

        return {
            accentColor,
            themeMode,
            colorScheme,
            blurEnabled,
            getBackgroundColor: (_opacity: number = 0.84) => lightWindow,

            windowBackground:        lightWindow,
            sidebarBackground:       lightSidebar,
            titleBarBackground:      lightTitlebar,
            dockBackground:          lightDock,
            menuBarBackground:       lightMenuBar,
            notificationBackground:  lightNotif,

            blurStyle: blurEnabled ? { backdropFilter: 'blur(16px)' } : { backdropFilter: 'none' },
        };
    }

    const baseColor = getBaseTintColor();

    // Visual Hierarchy: Title (Darkest) > Sidebar (Medium) > Content (Lightest)
    return {
        accentColor,
        themeMode,
        colorScheme,
        blurEnabled,
        // General background with opacity
        getBackgroundColor: (opacity: number = 0.7) => withOpacity(baseColor, opacity),

        // Component specific colors - Hierarchy enforced
        windowBackground: withOpacity(baseColor, 0.7),      // Content: Lightest
        sidebarBackground: withOpacity(baseColor, 0.85),    // Sidebar: Medium
        titleBarBackground: withOpacity(baseColor, 0.95),   // Title Bar: Darkest
        dockBackground: withOpacity(baseColor, 0.5),        // Dock: Translucent
        menuBarBackground: withOpacity(baseColor, 0.95),    // Menu Bar: Almost Opaque
        notificationBackground: withOpacity(baseColor, 0.85), // Notifications: Medium

        // Blur style helper - disables backdrop-filter if blur is disabled
        blurStyle: blurEnabled ? { backdropFilter: 'blur(12px)' } : { backdropFilter: 'none' },
    };
}
