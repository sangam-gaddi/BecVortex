"use client";
import { useState, useRef, useEffect } from 'react';
import { useFileSystem } from '@/components/os/components/FileSystemContext';
import { cn } from '@/components/os/components/ui/utils';
import { ArrowRight, Loader2 } from 'lucide-react';
import { GameScreenLayout } from '@/components/os/components/Game/GameScreenLayout';
import { feedback } from '@/components/os/services/soundFeedback';
import { softReset } from '@/components/os/utils/memory';

import { useAppContext } from '@/components/os/components/AppContext';
import { useI18n } from '@/components/os/i18n/index';

export function LoginScreen() {
    const { users, login, currentUser, resetFileSystem } = useFileSystem();
    const { accentColor, isLocked, setIsLocked } = useAppContext();
    const { t } = useI18n();

    const [password, setPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [error, setError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const didAutoLogin = useRef(false);

    // Always auto-login as guest when not logged in (authentication happens on homepage)
    useEffect(() => {
        if (currentUser || isLocked || didAutoLogin.current) return;
        didAutoLogin.current = true;

        // Try guest first (always exists), fall back to first available user
        const guestUser = users.find(u => u.username === 'guest');
        if (guestUser) {
            const success = login('guest', 'guest');
            if (success) {
                feedback.click();
                return;
            }
        }

        // Fallback: try first non-root user
        const fallbackUser = users.find(u => u.username !== 'root');
        if (fallbackUser && fallbackUser.password) {
            login(fallbackUser.username, fallbackUser.password);
        }
    }, [currentUser, isLocked, users, login]);

    // Lock screen: password prompt for current user
    if (isLocked) {
        const lockedUser = users.find(u => u.username === currentUser);

        const handleUnlock = () => {
            if (!lockedUser) return;
            setIsLoggingIn(true);
            setError(false);

            const success = login(lockedUser.username, password);
            if (success) {
                feedback.click();
                setIsLocked(false);
            } else {
                setError(true);
                inputRef.current?.focus();
            }
            setIsLoggingIn(false);
        };

        return (
            <GameScreenLayout
                zIndex={50000}
                mode="glass"
                footerActions={
                    <>
                        <button
                            onClick={() => { softReset(); window.location.reload(); }}
                            className="hover:text-white transition-colors"
                        >
                            {t('login.softReset')}
                        </button>
                        <span>•</span>
                        <button
                            onClick={() => {
                                if (window.confirm(t('login.hardResetConfirm'))) {
                                    resetFileSystem();
                                    window.location.reload();
                                }
                            }}
                            className="hover:text-red-400 transition-colors"
                        >
                            {t('login.hardReset')}
                        </button>
                    </>
                }
            >
                <div className="w-full max-w-md flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                    <div className="relative mb-6">
                        <div className="w-24 h-24 rounded-full bg-linear-to-br from-slate-400 to-slate-600 flex items-center justify-center shadow-2xl ring-4 ring-white/10">
                            <span className="text-4xl font-bold text-white uppercase">{lockedUser?.fullName?.charAt(0) || '?'}</span>
                        </div>
                    </div>

                    <h2 className="text-2xl font-semibold text-white mb-2">{lockedUser?.fullName || 'User'}</h2>
                    <p className="text-white/50 mb-6">{t('login.enterPasswordToUnlock')}</p>

                    <div className="w-full relative mb-4">
                        <input
                            ref={inputRef}
                            type="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(false); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock(); }}
                            placeholder={t('login.passwordPlaceholder')}
                            className={cn(
                                "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-center outline-none focus:border-white/30 transition-all",
                                error && "border-red-500/50 bg-red-500/10 animate-shake"
                            )}
                            autoFocus
                        />
                        {error && (
                            <p className="absolute -bottom-6 left-0 right-0 text-center text-red-300 text-xs">
                                {t('login.incorrectPassword')}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={handleUnlock}
                        disabled={!password || isLoggingIn}
                        className={cn(
                            "w-full py-3 px-6 rounded-xl font-medium text-white shadow-lg transition-all mt-4",
                            "active:scale-95 disabled:opacity-50 disabled:active:scale-100",
                            "flex items-center justify-center gap-2"
                        )}
                        style={{ backgroundColor: accentColor, filter: 'brightness(1.1)' }}
                    >
                        {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{t('login.enterSystem')} <ArrowRight className="w-4 h-4 ml-1" /></>}
                    </button>
                </div>
            </GameScreenLayout>
        );
    }

    // Not locked, not logged in — auto-login is running, show nothing (transparent)
    return null;
}
