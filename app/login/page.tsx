"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Mail, ArrowLeft, Bell, CheckCircle2, AlertCircle } from "lucide-react";

type AuthMode = "login" | "register" | "forgot";

export default function Login() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [botAnswer, setBotAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL || "";

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === "register") {
        if (botAnswer.toLowerCase().trim() !== "chess") {
          throw new Error("Anti-bot verification failed. Try again.");
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        alert("Registration successful! You can now log in.");
        switchMode("login");
      } else if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        window.location.href = "/dashboard";
      } else if (mode === "forgot") {
        // (1) Best-effort owner notification log in Supabase (if table exists)
        try {
          await supabase
            .from("password_reset_requests")
            .insert([{ email: email.trim(), status: "pending" }]);
        } catch {
          // Table is optional; mailto notification below still works
        }

        // (2) Send Supabase password recovery email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );
        if (resetError) throw resetError;

        setSuccessMsg(
          "Password reset email sent! Check your inbox (and spam folder). You can also notify the owner directly below if needed."
        );
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const mailtoSubject = encodeURIComponent("Klaymore Hub - Password Reset Request");
  const mailtoBody = encodeURIComponent(
    `Hello,\n\nI requested a password reset for my Klaymore Hub account.\nAccount Email: ${email || "[enter your account email]"}\n\nThank you!`
  );
  const notifyOwnerHref = `mailto:${ownerEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 border border-border rounded-xl shadow-sm bg-background">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-border rounded-md mb-4 flex items-center justify-center overflow-hidden">
            <img src="/placeholder.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold">
            {mode === "login"
              ? "Welcome Back"
              : mode === "register"
              ? "Create Account"
              : "Reset Password"}
          </h1>
          {mode === "forgot" && (
            <p className="text-xs text-foreground/60 mt-1 text-center">
              Notify the owner or receive a password reset link via email.
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md text-sm flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-md text-sm flex items-start gap-2">
            <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Password</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs text-accent hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          )}

          {mode === "register" && (
            <div className="p-4 border border-accent rounded-md bg-accent/10">
              <label className="block text-sm font-medium mb-2 text-accent">
                Security Question: What strategy board game has 64 squares and a goal to checkmate the king?
              </label>
              <input
                type="text"
                required
                placeholder="Your answer..."
                value={botAnswer}
                onChange={(e) => setBotAnswer(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mode === "forgot" && <Mail size={16} />}
            {loading
              ? "Processing..."
              : mode === "login"
              ? "Sign In"
              : mode === "register"
              ? "Register"
              : "Send Reset Email"}
          </button>
        </form>

        {mode === "forgot" && (
          <div className="mt-5 p-4 border border-border rounded-lg bg-surface space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bell size={16} className="text-accent" />
              <span>Notify the Owner</span>
            </div>
            <p className="text-xs text-foreground/70 leading-relaxed">
              Need manual help or didn&apos;t receive the email? Send a password reset notification directly to the workspace owner.
            </p>
            <a
              href={notifyOwnerHref}
              className="w-full py-2 px-3 text-xs font-medium border border-border bg-background hover:border-accent hover:text-accent rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <Mail size={14} />
              {ownerEmail ? `Notify Owner (${ownerEmail})` : "Notify Owner via Email"}
            </a>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-foreground/70">
          {mode === "forgot" ? (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="inline-flex items-center gap-1.5 text-accent hover:underline font-medium"
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          ) : (
            <>
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="text-accent hover:underline font-medium"
              >
                {mode === "login" ? "Sign up" : "Log in"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}