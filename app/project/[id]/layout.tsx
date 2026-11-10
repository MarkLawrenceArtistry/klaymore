"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  Users,
  ListTodo,
  CalendarDays,
  KanbanSquare,
  Settings,
  Moon,
  ClipboardList,
  UserCircle,
  LogOut // Added LogOut icon
} from "lucide-react";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [projectName, setProjectName] = useState("Loading...");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("member");

  const navItems = [
    { name: "Dashboard", href: `/project/${projectId}/dashboard`, icon: LayoutDashboard },
    { name: "My Tasks", href: `/project/${projectId}/my-tasks`, icon: ClipboardList },
    { name: "Team", href: `/project/${projectId}/team`, icon: Users },
    { name: "Sprints", href: `/project/${projectId}/sprints`, icon: ListTodo },
    { name: "Roadmap", href: `/project/${projectId}/roadmap`, icon: CalendarDays },
    { name: "Backlog", href: `/project/${projectId}/backlog`, icon: KanbanSquare },
    { name: "Settings", href: `/project/${projectId}/settings`, icon: Settings }, // Added Settings
  ];

  useEffect(() => {
    setMounted(true);
    if (projectId) fetchLayoutData();
  }, [projectId]);

  const fetchLayoutData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      setUserEmail(userData.user.email || "");
      
      // Get role
      const { data: member } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", userData.user.id)
        .single();
      if (member) setUserRole(member.role);
    }

    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();

    if (project) setProjectName(project.name);
  };

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
  };

  const handleExitProject = () => {
    // Forces browser to dump cache and fully load the dashboard
    window.location.href = "/dashboard";
  };

  if (!mounted) return null;

  // Hide settings if not a PM (optional, but good UX)
  const filteredNav = navItems.filter(item => 
    item.name !== "Settings" || userRole === "Project Manager"
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-64 bg-surface border-r border-border flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 flex-shrink-0 bg-border rounded flex items-center justify-center overflow-hidden">
              <img src="/placeholder.png" alt="Logo" className="w-full h-full opacity-0" />
            </div>
            <span className="font-bold text-sm truncate flex-1" title={projectName}>
              {projectName}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-bold text-foreground/50 mb-4 px-2 uppercase tracking-wider">
            Menu
          </div>
          {filteredNav.map((item) => {
            const isActive = pathname?.includes(item.href);
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
          <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-background border border-border rounded-md shadow-sm">
             <UserCircle size={18} className="text-accent" />
             <span className="text-xs font-medium truncate text-foreground/70" title={userEmail}>
               {userEmail}
             </span>
          </div>

          <button
            onClick={toggleDarkMode}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground/70 hover:bg-border/50 transition-colors"
          >
            <Moon size={18} />
            Toggle Theme
          </button>
          <button
            onClick={handleExitProject}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground/70 hover:bg-border/50 hover:text-red-500 transition-colors"
          >
            <LogOut size={18} /> {/* Changed to LogOut icon */}
            Exit Project
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}