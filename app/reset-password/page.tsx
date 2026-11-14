"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const initRecovery = async () => {
      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeErr) {
          setError("Invalid or expired password reset link.");
          setReady(true);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setReady(true);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    initRecovery();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setLoading(false);

    if (updateErr) {
      setError(updateErr.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 border border-border rounded-xl shadow-sm bg-background">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-accent/10 text-accent rounded-full mb-4 flex items-center justify-center">
            <Lock size={22} />
          </div>
          <h1 className="text-2xl font-bold">Set New Password</h1>
          <p className="text-xs text-foreground/60 mt-1 text-center">
            Enter a new password for your Klaymore Hub account.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md text-sm flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>Password updated! Redirecting to dashboard...</span>
          </div>
        ) : !ready ? (
          <div className="text-center py-6 space-y-3">
            <Loader2 className="animate-spin text-accent w-6 h-6 mx-auto" />
            <p className="text-xs text-foreground/60">
              Verifying your reset link... If this takes too long, request a new reset email from the login page.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="text-xs text-accent hover:underline font-medium"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors font-medium disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="animate-spin text-accent w-8 h-8" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}