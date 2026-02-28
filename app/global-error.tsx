"use client"

import { useEffect } from "react"
import { AlertOctagon, RefreshCw } from "lucide-react"

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global application error:", error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center px-4 bg-black text-white font-sans">
        <div className="flex flex-col items-center gap-8 max-w-md text-center">
          {/* Icon */}
          <div className="w-24 h-24 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <AlertOctagon className="w-10 h-10 text-red-500" />
          </div>

          {/* Error Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Critical Error</h1>
            <p className="text-neutral-400">
              A critical error occurred while loading the application. 
              Please refresh the page to try again.
            </p>
          </div>

          {/* Error Details */}
          {error.digest && (
            <div className="w-full p-4 rounded-lg bg-neutral-900 border border-neutral-800">
              <p className="text-xs text-neutral-500">
                Error ID: {error.digest}
              </p>
            </div>
          )}

          {/* Actions */}
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-neutral-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Page
          </button>

          {/* Decorative Element */}
          <div className="mt-8 flex items-center gap-2 text-sm text-neutral-500">
            <span className="w-12 h-px bg-neutral-700" />
            <span>Pyaw Kyi</span>
            <span className="w-12 h-px bg-neutral-700" />
          </div>
        </div>
      </body>
    </html>
  )
}
