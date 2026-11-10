"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Plus, FolderKanban, Loader2, Trash2 } from "lucide-react";

function DashboardContent() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    setProjects([]); // <-- ADD THIS: Clears ghost projects instantly on load

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }

    // Fetch projects directly
    const { data, error } = await supabase
      .from("project_members")
      .select("role, projects(id, name, description, created_at)")
      .eq("user_id", userData.user.id);

    if (!error && data) {
      const formattedProjects = data
        .map((item: any) => ({
          ...item.projects,
          myRole: item.role
        }))
        .filter((p) => p && p.id); // Filter out any corrupted/null projects
      setProjects(formattedProjects);
    }
    setLoading(false);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: newProject, error: projectError } = await supabase
      .from("projects")
      .insert([{ name: newProjectName, description: newProjectDesc }])
      .select()
      .single();

    if (projectError || !newProject) {
      alert("Error creating project");
      setCreating(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("project_members")
      .insert([
        {
          project_id: newProject.id,
          user_id: userData.user.id,
          role: "Project Manager",
        },
      ]);

    if (!memberError) {
      setIsModalOpen(false);
      setNewProjectName("");
      setNewProjectDesc("");
      fetchProjects();
    }
    setCreating(false);
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation(); // Prevents the click from redirecting into the project
    if (!confirm(`Are you absolutely sure you want to delete "${projectName}"? This action cannot be undone.`)) return;

    try {
      console.log(`Starting deletion process for project: ${projectId}`);

      // 1. Delete dependencies silently (it's okay if they return 0 rows if they are empty)
      await supabase.from("tasks").delete().eq("project_id", projectId);
      await supabase.from("backlog_tasks").delete().eq("project_id", projectId);
      await supabase.from("sprints").delete().eq("project_id", projectId);
      await supabase.from("project_members").delete().eq("project_id", projectId);

      // 2. Delete the Project AND .select() to verify it actually worked
      console.log("Deleting core project...");
      const { data, error: projectErr } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .select(); // <--- THIS IS THE MAGIC BULLET
      
      if (projectErr) throw projectErr;
      
      // If data is empty, Supabase RLS blocked it silently!
      if (!data || data.length === 0) {
        throw new Error("Supabase blocked the delete! Your database Row Level Security (RLS) is preventing it. Run the SQL script provided to fix this.");
      }

      console.log("Project successfully deleted from database!");

      // 3. Immediately remove it from the UI
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
    } catch (err: any) {
      console.error("CRITICAL DELETE ERROR:", err);
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-accent w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-border rounded-md flex items-center justify-center overflow-hidden">
             <img src="/placeholder.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold">Klaymore Hub</h1>
        </div>
        <button onClick={handleLogout} className="text-sm text-foreground/60 hover:text-foreground">
          Sign Out
        </button>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Your Projects</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
          >
            <Plus size={16} /> New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
            <FolderKanban className="mx-auto w-12 h-12 text-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-foreground/60 text-sm mb-4">Create your first project to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => window.location.href = `/project/${project.id}/dashboard`}
                className="p-6 border border-border rounded-xl bg-surface hover:border-accent cursor-pointer transition-all hover:shadow-sm group relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg group-hover:text-accent transition-colors truncate pr-4">
                    {project.name}
                  </h3>
                  
                </div>

                <p className="text-sm text-foreground/70 line-clamp-2">
                  {project.description || "No description provided."}
                </p>

                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                  <span className="text-xs font-medium px-2 py-1 bg-background border border-border rounded-md">
                    {project.myRole}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name</label>
                <input type="text" required value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent" placeholder="e.g. Website Redesign 2025" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent resize-none h-24" placeholder="Briefly describe the project goals..." />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-foreground hover:bg-border rounded-md transition-colors">Cancel</button>
                <button type="submit" disabled={creating} className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50">{creating ? "Creating..." : "Create Project"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GlobalDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-accent w-8 h-8" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}