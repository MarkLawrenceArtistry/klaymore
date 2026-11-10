// app/login/page.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation"; // Use next/navigation for App Router
import Image from "next/image";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [botAnswer, setBotAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter(); // If this throws an error, import from 'next/navigation' instead of 'navigation'
  // Note: import { useRouter } from 'next/navigation'; is the correct one for App Router. Let's fix that conceptually.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!isLogin) {
        // Anti-bot check for registration
        if (botAnswer.toLowerCase().trim() !== "chess") {
          throw new Error("Anti-bot verification failed. Try again.");
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        alert("Registration successful! You can now log in.");
        setIsLogin(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        window.location.href = "/dashboard"; // Force refresh to dashboard
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 border border-border rounded-xl shadow-sm bg-background">
        <div className="flex flex-col items-center mb-8">
          {/* Blank image for logo as requested */}
          <div className="w-12 h-12 bg-border rounded-md mb-4 flex items-center justify-center overflow-hidden">
             {/* Replace src with your actual logo path later */}
             <img src="/placeholder.png" alt="Logo" className="w-full h-full object-cover " />
          </div>
          <h1 className="text-2xl font-bold">{isLogin ? "Welcome Back" : "Create Account"}</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md text-sm">
            {error}
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
              className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {!isLogin && (
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
                className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors font-medium disabled:opacity-50"
          >
            {loading ? "Processing..." : isLogin ? "Sign In" : "Register"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-foreground/70">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-accent hover:underline font-medium"
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}