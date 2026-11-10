// app/project/[id]/layout.tsx
"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation"; // ADDED useParams
import { 
  LayoutDashboard, 
  Users, 
  ListTodo, 
  CalendarDays, 
  KanbanSquare, 
  Settings,
  Moon
} from "lucide-react";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams(); // SAFE WAY in Next.js 15
  const projectId = params.id as string;

  const navItems = [
    { name: "Dashboard", href: `/project/${projectId}/dashboard`, icon: LayoutDashboard },
    { name: "Team", href: `/project/${projectId}/team`, icon: Users },
    { name: "Sprints", href: `/project/${projectId}/sprints`, icon: ListTodo },
    { name: "Roadmap", href: `/project/${projectId}/roadmap`, icon: CalendarDays },
    { name: "Backlog", href: `/project/${projectId}/backlog`, icon: KanbanSquare },
  ];

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
  };

  // Don't render until we have the ID to prevent broken links
  if (!projectId) return null; 

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-64 bg-surface border-r border-border flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-border rounded flex items-center justify-center overflow-hidden">
              <img src="/placeholder.png" alt="Logo" className="w-full h-full opacity-0" />
            </div>
            <span className="font-bold text-lg">Klaymore</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="text-xs font-bold text-foreground/50 mb-4 px-2 uppercase tracking-wider">
            Menu
          </div>
          {navItems.map((item) => {
            const isActive = pathname.includes(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-accent/10 text-accent" 
                    : "text-foreground/70 hover:bg-border/50 hover:text-foreground"
                }`}
              >
                <item.icon size={18} className={isActive ? "text-accent" : ""} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <button 
            onClick={toggleDarkMode}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground/70 hover:bg-border/50 transition-colors"
          >
            <Moon size={18} />
            Toggle Theme
          </button>
          <Link
            href="/dashboard"
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground/70 hover:bg-border/50 transition-colors"
          >
            <Settings size={18} />
            Exit Project
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}