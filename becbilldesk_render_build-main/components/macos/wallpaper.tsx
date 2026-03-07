"use client"

interface WallpaperProps {
    isDarkMode: boolean
}

export default function Wallpaper({ isDarkMode }: WallpaperProps) {
    return (
        <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-500"
            style={{
                backgroundImage: `url('/icons/wallpaper.png')`,
                filter: isDarkMode ? 'brightness(0.7)' : 'brightness(1)',
            }}
        />
    )
}
