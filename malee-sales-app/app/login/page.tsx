"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Loader2 } from "lucide-react"
import { checkBackendHealth, login } from "@/lib/api-client"
import { markAuthDisabled, storeToken } from "@/lib/auth"

function LoginForm() {
    const router = useRouter()
    const params = useSearchParams()
    const next = params.get("next") || "/"
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [busy, setBusy] = useState(false)
    const [probing, setProbing] = useState(true)

    // A backend with no DEMO_PASSWORD (local development) needs no login: health says so, and health is open.
    useEffect(() => {
        let cancelled = false
        checkBackendHealth()
            .then((h) => {
                if (cancelled || h.auth_required !== false) return
                markAuthDisabled()
                router.replace(next)
            })
            .catch(() => undefined)
            .finally(() => !cancelled && setProbing(false))
        return () => { cancelled = true }
    }, [next, router])

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setBusy(true)
        setError("")
        try {
            const r = await login(password)
            if (r.auth_required) storeToken(r.token, r.expires_at)
            else markAuthDisabled()
            router.replace(next)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Sign-in failed")
            setBusy(false)
        }
    }

    return (
        <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
                <Label htmlFor="password">Demo password</Label>
                <input type="text" name="username" value="demo" readOnly hidden autoComplete="username" />
                <Input
                    id="password"
                    type="password"
                    autoFocus
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || probing}>
                {busy || probing ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
            </Button>
            <p className="text-xs text-muted-foreground">The session lasts 12 hours on this browser.</p>
        </form>
    )
}

export default function LoginPage() {
    return (
        <main className="min-h-screen grid place-items-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 p-6">
            <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-xl">
                <div className="mb-6 flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-blue-900 text-white">
                        <Lock className="size-5" />
                    </span>
                    <div>
                        <h1 className="text-lg font-semibold leading-tight">Demand Forecast</h1>
                        <p className="text-sm text-muted-foreground">Sign in to open the demo</p>
                    </div>
                </div>
                <Suspense fallback={null}>
                    <LoginForm />
                </Suspense>
            </div>
        </main>
    )
}
