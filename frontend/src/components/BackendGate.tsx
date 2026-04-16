import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../api/client';

interface BackendGateProps {
  children: React.ReactNode;
}

/**
 * Splash screen that polls the backend health endpoint until it responds.
 * Prevents the app from rendering (and firing API calls) before the
 * backend process is ready to accept requests.
 */
export default function BackendGate({ children }: BackendGateProps) {
  const [ready, setReady] = useState(false);
  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/health`, { timeout: 2000 });
        if (!cancelled && res.data?.status === 'ok') {
          setReady(true);
        }
      } catch {
        // Backend not ready yet — keep polling
      }
    };

    // Poll every 500ms
    checkHealth();
    intervalRef.current = setInterval(checkHealth, 500);

    // Animate dots
    dotsRef.current = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    // Track elapsed time
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (dotsRef.current) clearInterval(dotsRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Clear intervals once ready
  useEffect(() => {
    if (ready) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (dotsRef.current) clearInterval(dotsRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [ready]);

  if (ready) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#1F4E79] via-[#2a6399] to-[#1a3d5c] flex flex-col items-center justify-center z-[9999]">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-white/3 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center space-y-8">
        {/* Logo / Icon */}
        <div className="relative">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl overflow-hidden p-2">
            <img src="/src/assets/app_logo.png" alt="AuditArk Logo" className="w-full h-full object-contain" />
          </div>
          {/* Spinning ring */}
          <div className="absolute -inset-3 rounded-[1.75rem] border-2 border-white/20 border-t-white/70 animate-spin" style={{ animationDuration: '1.5s' }} />
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            AuditArk
          </h1>
          <p className="text-white/60 text-sm font-medium tracking-wide uppercase">
            Financial Ledger System
          </p>
        </div>

        {/* Status */}
        <div className="flex flex-col items-center space-y-3">
          <p className="text-white/80 text-base font-medium">
            Starting engine{dots}<span className="invisible">...</span>
          </p>

          {/* Progress bar animation */}
          <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-white/30 via-white/70 to-white/30 rounded-full animate-pulse"
              style={{
                width: `${Math.min(90, elapsed * 6)}%`,
                transition: 'width 1s ease-out',
              }}
            />
          </div>

          {elapsed > 5 && (
            <p className="text-white/40 text-xs mt-2 animate-fade-in">
              Loading OCR models — this may take a moment on first launch
            </p>
          )}

          {elapsed > 20 && elapsed <= 60 && (
            <p className="text-amber-300/70 text-xs animate-fade-in">
              Taking longer than usual. Please wait...
            </p>
          )}

          {elapsed > 60 && (
            <div className="text-center animate-fade-in space-y-2">
              <p className="text-red-400 text-sm font-medium">
                Backend failed to start
              </p>
              <p className="text-white/50 text-xs max-w-xs">
                The engine could not be loaded. Check the log file at:<br />
                <code className="text-white/70 text-[10px] break-all">
                  %LOCALAPPDATA%\com.receiptprocessor.app\logs\backend.log
                </code>
              </p>
              <p className="text-white/40 text-xs mt-1">
                Try restarting the app. If the issue persists, reinstall with the latest version.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-white/30 text-xs">
        v2.0.0 • Offline Financial Data & Reporting
      </div>
    </div>
  );
}
