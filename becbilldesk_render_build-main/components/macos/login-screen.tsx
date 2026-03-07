"use client"

import { useState } from "react"
import { Loader2, Lock, User } from "lucide-react"
import Wallpaper from "@/components/macos/wallpaper"
import toast from "react-hot-toast"

interface LoginScreenProps {
    onLogin: (studentName: string) => void
    isDarkMode: boolean
    onToggleDarkMode: () => void
}

export default function LoginScreen({ onLogin, isDarkMode, onToggleDarkMode }: LoginScreenProps) {
    const [usn, setUsn] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: usn.toUpperCase(), password })
            })

            const data = await response.json()

            if (response.ok) {
                toast.success('Login successful!', { duration: 2000 })
                onLogin(data.student?.studentName || usn)
            } else {
                setError(data.error || 'Invalid credentials')
                toast.error(data.error || 'Login failed', { duration: 2000 })
            }
        } catch (err) {
            setError('An error occurred. Please try again.')
            toast.error('An error occurred', { duration: 2000 })
        } finally {
            setIsLoading(false)
        }
    }

    const textClass = isDarkMode ? "text-white" : "text-gray-800"

    return (
        <div className="relative h-screen w-screen">
            <Wallpaper isDarkMode={isDarkMode} />

            <div className="absolute inset-0 backdrop-blur-sm bg-black/20 flex flex-col items-center justify-center">
                <div className="text-center mb-8">
                    {/* Profile Picture Placeholder */}
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-2xl">
                        <User className="w-16 h-16 text-white" />
                    </div>
                    <h1 className={`text-2xl font-bold ${textClass} mb-1`}>BEC BillDesk</h1>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Enter your credentials to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 w-80">
                    {/* USN Input */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        </div>
                        <input
                            type="text"
                            placeholder="USN (e.g., 2BA23IS083)"
                            value={usn}
                            onChange={(e) => setUsn(e.target.value.toUpperCase())}
                            className={`w-full pl-10 pr-4 py-3 rounded-xl ${isDarkMode
                                ? 'bg-gray-800/80 text-white placeholder-gray-400'
                                : 'bg-white/80 text-gray-900 placeholder-gray-500'
                                } backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-all`}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* Password Input */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        </div>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full pl-10 pr-4 py-3 rounded-xl ${isDarkMode
                                ? 'bg-gray-800/80 text-white placeholder-gray-400'
                                : 'bg-white/80 text-gray-900 placeholder-gray-500'
                                } backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-all`}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    )}

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={isLoading || !usn || !password}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {/* Dark Mode Toggle */}
                <button
                    onClick={onToggleDarkMode}
                    className={`mt-6 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-800/60 text-white' : 'bg-white/60 text-gray-800'
                        } backdrop-blur-md text-sm hover:scale-105 transition-transform`}
                >
                    {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>

                {/* Time */}
                <p className={`mt-8 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {new Date().toLocaleString('en-US', {
                        weekday: 'long',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    })}
                </p>
            </div>
        </div>
    )
}
