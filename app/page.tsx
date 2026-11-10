import Link from "next/link";
import { ArrowRight, LayoutDashboard, ListTodo, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navigation Bar */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-background rounded flex items-center justify-center overflow-hidden border border-border">
              <img src="/placeholder.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-lg tracking-tight">Klaymore Hub</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-accent transition-colors">
              Log in
            </Link>
            <Link 
              href="/login" 
              className="text-sm font-medium bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md transition-all shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-8 border border-accent/20">
          <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse"></span>
          Now in Beta v1.0
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl">
          Manage your projects with <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-500">absolute clarity.</span>
        </h1>
        
        <p className="text-lg text-foreground/60 mb-10 max-w-2xl leading-relaxed">
          The ultimate workspace for agile teams. Track sprints, manage your backlog, 
          and monitor real-time KPIs without the clutter.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/login" 
            className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-accent/20 hover:-translate-y-1"
          >
            Start for free <ArrowRight size={20} />
          </Link>
          <a 
            href="#features" 
            className="flex items-center justify-center px-8 py-4 rounded-lg font-bold text-lg bg-surface border border-border hover:bg-border/50 transition-all"
          >
            Explore Features
          </a>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="bg-surface border-t border-border py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need to ship faster</h2>
            <p className="text-foreground/60 max-w-xl mx-auto">Built specifically for modern development teams who want to focus on work, not on managing tools.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background p-8 rounded-2xl border border-border shadow-sm hover:border-accent/50 transition-colors">
              <div className="w-12 h-12 bg-accent/10 text-accent rounded-xl flex items-center justify-center mb-6">
                <ListTodo size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Sprint Planning</h3>
              <p className="text-foreground/60 leading-relaxed">
                Organize work into time-boxed sprints. Assign tasks, set deadlines, and track progress effortlessly.
              </p>
            </div>

            <div className="bg-background p-8 rounded-2xl border border-border shadow-sm hover:border-accent/50 transition-colors">
              <div className="w-12 h-12 bg-accent/10 text-accent rounded-xl flex items-center justify-center mb-6">
                <LayoutDashboard size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Real-time KPIs</h3>
              <p className="text-foreground/60 leading-relaxed">
                Get instant insights into your project's health with automated completion graphs and team workload metrics.
              </p>
            </div>

            <div className="bg-background p-8 rounded-2xl border border-border shadow-sm hover:border-accent/50 transition-colors">
              <div className="w-12 h-12 bg-accent/10 text-accent rounded-xl flex items-center justify-center mb-6">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Team Collaboration</h3>
              <p className="text-foreground/60 leading-relaxed">
                Invite members instantly via token links. Assign roles, nicknames, and manage access from a single dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center bg-background">
        <p className="text-foreground/40 text-sm">
          © {new Date().getFullYear()} Klaymore Hub. All rights reserved.
        </p>
      </footer>
    </div>
  );
}