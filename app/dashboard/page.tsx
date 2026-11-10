// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Plus, FolderKanban, Loader2 } from "lucide-react";
import Image from "next/image";

export default function GlobalDashboard() {
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
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }

    // Fetch projects where the user is a member
    const { data, error } = await supabase
      .from("project_members")
      .select("project_id, projects(id, name, description, created_at)")
      .eq("user_id", userData.user.id);

    if (!error && data) {
      // Map the relational data to a clean array
      const formattedProjects = data.map((item: any) => item.projects);
      setProjects(formattedProjects);
    }
    setLoading(false);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // 1. Create the project
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

    // 2. Add the creator as the 'system' Project Manager
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
      fetchProjects(); // Refresh the list
    }
    setCreating(false);
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
      {/* Header */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-border rounded-md flex items-center justify-center overflow-hidden">
             {/* Blank logo */}
             <img src="/placeholder.png" alt="Logo" className="w-full h-full object-cover opacity-0" />
          </div>
          <h1 className="text-2xl font-bold">Klaymore Hub</h1>
        </div>
        <button onClick={handleLogout} className="text-sm text-foreground/60 hover:text-foreground">
          Sign Out
        </button>
      </div>

      {/* Main Content */}
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

        {/* Project Grid */}
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
                onClick={() => router.push(`/project/${project.id}/dashboard`)}
                className="p-6 border border-border rounded-xl bg-input-bg hover:border-accent cursor-pointer transition-all hover:shadow-sm group"
              >
                <h3 className="font-semibold text-lg mb-2 group-hover:text-accent transition-colors">
                  {project.name}
                </h3>
                <p className="text-sm text-foreground/70 line-clamp-2">
                  {project.description || "No description provided."}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="e.g. Website Redesign 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:ring-2 focus:ring-accent resize-none h-24"
                  placeholder="Briefly describe the project goals..."
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground hover:bg-border rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}