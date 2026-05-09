"use client";

import { useState, useActionState } from "react";
import { login, signup, type AuthState } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(login, null);
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(signup, null);

  const isPending = loginPending || signupPending;
  const error = mode === "login" ? loginState?.error : signupState?.error;

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex size-12 items-center justify-center rounded-xl" style={{backgroundColor: "#C1440E"}}>
            <svg className="size-8 text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={8} strokeLinejoin="round" strokeLinecap="round">
              <path d="M15 10 L65 10 L65 42 L85 42 L85 90 L15 90 Z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white">The Startup State</h1>
          <p className="mt-1 text-sm text-zinc-400">Utah&apos;s startup ecosystem map</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
          <div className="mb-6 flex rounded-lg bg-zinc-800 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                mode === "signup"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Create account
            </button>
          </div>

          <form action={mode === "login" ? loginAction : signupAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none ring-blue-500 focus:border-blue-500 focus:ring-1 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                minLength={8}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none ring-blue-500 focus:border-blue-500 focus:ring-1 transition-colors"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
            >
              {isPending
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
