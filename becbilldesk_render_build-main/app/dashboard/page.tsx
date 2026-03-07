"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import BootScreen from "@/components/macos/boot-screen"
import LoginScreen from "@/components/macos/login-screen"
import Desktop from "@/components/macos/desktop"
import SleepScreen from "@/components/macos/sleep-screen"
import ShutdownScreen from "@/components/macos/shutdown-screen"
import { Toaster } from "react-hot-toast"

type SystemState = "booting" | "login" | "desktop" | "sleeping" | "shutdown" | "restarting"

export default function DashboardPage() {
  const router = useRouter()
  const [systemState, setSystemState] = useState<SystemState>("booting")
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [screenBrightness, setScreenBrightness] = useState(90)
  const [studentName, setStudentName] = useState("Student")
  const [studentUsn, setStudentUsn] = useState("unknown")
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setStudentName(data.student?.studentName || 'Student')
          setStudentUsn(data.student?.usn || 'unknown')
          // User is authenticated, skip login
          setSystemState("desktop")
        } else {
          // Not authenticated, show boot sequence
          setSystemState("booting")
        }
      } catch (error) {
        setSystemState("booting")
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [])

  // Boot sequence timer
  useEffect(() => {
    if (systemState === "booting" || systemState === "restarting") {
      const timer = setTimeout(() => {
        setSystemState("login")
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [systemState])

  // Load settings from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("isDarkMode")
    if (savedDarkMode !== null) {
      setIsDarkMode(savedDarkMode === "true")
    }

    const savedBrightness = localStorage.getItem("screenBrightness")
    if (savedBrightness !== null) {
      setScreenBrightness(Number.parseInt(savedBrightness))
    }
  }, [])

  const handleLogin = (name: string) => {
    setStudentName(name)
    setSystemState("desktop")
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    }
    setSystemState("login")
    router.push('/')
  }

  const handleSleep = () => {
    setSystemState("sleeping")
  }

  const handleWakeUp = () => {
    setSystemState("login")
  }

  const handleShutdown = () => {
    setSystemState("shutdown")
  }

  const handleBoot = () => {
    setSystemState("booting")
  }

  const handleRestart = () => {
    setSystemState("restarting")
  }

  const toggleDarkMode = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    localStorage.setItem("isDarkMode", newMode.toString())
  }

  const updateBrightness = (value: number) => {
    setScreenBrightness(value)
    localStorage.setItem("screenBrightness", value.toString())
  }

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="three-body">
          <div className="three-body__dot"></div>
          <div className="three-body__dot"></div>
          <div className="three-body__dot"></div>
        </div>
      </div>
    )
  }

  // Render the appropriate screen based on system state
  const renderScreen = () => {
    switch (systemState) {
      case "booting":
      case "restarting":
        return <BootScreen />

      case "login":
        return <LoginScreen onLogin={handleLogin} isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} />

      case "desktop":
        return (
          <Desktop
            onLogout={handleLogout}
            onSleep={handleSleep}
            onShutdown={handleShutdown}
            onRestart={handleRestart}
            initialDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
            initialBrightness={screenBrightness}
            onBrightnessChange={updateBrightness}
            studentName={studentName}
            studentUsn={studentUsn}
          />
        )

      case "sleeping":
        return <SleepScreen onWakeUp={handleWakeUp} isDarkMode={isDarkMode} />

      case "shutdown":
        return <ShutdownScreen onBoot={handleBoot} />

      default:
        return <BootScreen />
    }
  }

  return (
    <div className="relative">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '12px',
          },
        }}
      />
      {renderScreen()}

      {/* Brightness overlay - apply to all screens */}
      <div
        className="absolute inset-0 bg-black pointer-events-none z-[100] transition-opacity duration-300"
        style={{ opacity: Math.max(0, 0.9 - screenBrightness / 100) }}
      />
    </div>
  )
}
