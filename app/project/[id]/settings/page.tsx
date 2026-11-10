"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { AlertTriangle, Save, Trash2, Loader2, Info } from "lucide-react";

export default function ProjectSettings() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userRole, setUserRole] = useState("member");
  
  const [projectData, setProjectData] = useState({ name: "", description: "" });

  useEffect(() => {
    if (projectId) fetchProjectSettings();
  }, [projectId]);

  const fetchProjectSettings = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();

    if (userData?.user) {
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
      .select("name, description")
      .eq("id", projectId)
      .single();

    if (project) {
      setProjectData({ name: project.name, description: project.description || "" });
    }
    setLoading(false);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== "Project Manager") return;
    
    setSaving(true);
    const { error } = await supabase
      .from("projects")
      .update({ name: projectData.name, description: projectData.description })
      .eq("id", projectId);

    setSaving(false);
    if (!error) alert("Project updated successfully!");
  };

  const handleDeleteProject = async () => {
    if (userRole !== "Project Manager") return;
    
    const confirmation = prompt(`Type "${projectData.name}" to confirm deletion. This cannot be undone.`);
    if (confirmation !== projectData.name) {
      if (confirmation !== null) alert("Project name did not match. Deletion cancelled.");
      return;
    }

    setDeleting(true);

    try {
      // 1. Manually delete all dependencies so the database doesn't block the request
      await supabase.from("tasks").delete().eq("project_id", projectId);
      await supabase.from("backlog_tasks").delete().eq("project_id", projectId);
      await supabase.from("sprints").delete().eq("project_id", projectId);
      await supabase.from("project_members").delete().eq("project_id", projectId);

      // 2. Finally, delete the project
      const { error } = await supabase.from("projects").delete().eq("id", projectId);
      
      if (error) throw error;
      
      // Force a hard redirect to clear Next.js memory cache
      window.location.href = "/dashboard";
    } catch (err: any) {
      alert(`Failed to delete project: ${err.message}`);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-accent w-8 h-8" />
      </div>
    );
  }

  const isPM = userRole === "Project Manager";

  return (
    <div className="p-8 max-w-3xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Project Settings</h1>
        <p className="text-sm text-foreground/60">Manage project details and danger zones.</p>
      </div>

      {!isPM && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">You are viewing this project as a <strong>{userRole}</strong>. Only Project Managers can modify settings or delete the project.</p>
        </div>
      )}

      {/* General Settings */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-8 shadow-sm">
        <h2 className="text-lg font-bold mb-4">General Settings</h2>
        <form onSubmit={handleUpdateProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Name</label>
            <input 
              type="text" 
              required 
              disabled={!isPM}
              value={projectData.name} 
              onChange={(e) => setProjectData({...projectData, name: e.target.value})} 
              className="w-full p-2 border border-border rounded-md bg-background focus:outline-none focus:border-accent disabled:opacity-60" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea 
              disabled={!isPM}
              value={projectData.description} 
              onChange={(e) => setProjectData({...projectData, description: e.target.value})} 
              className="w-full p-2 border border-border rounded-md bg-background focus:outline-none focus:border-accent resize-none h-32 disabled:opacity-60" 
            />
          </div>
          
          {isPM && (
            <div className="flex justify-end pt-2">
              <button 
                type="submit" 
                disabled={saving} 
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md transition-colors text-sm font-medium disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Danger Zone */}
      {isPM && (
        <div className="border border-red-500/30 rounded-xl overflow-hidden shadow-sm bg-background">
          <div className="bg-red-500/10 p-6 border-b border-red-500/20 flex flex-col sm:flex-row items-start gap-4">
            <AlertTriangle className="text-red-500 w-6 h-6 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-bold text-red-500 mb-2">Danger Zone</h2>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Proceed with extreme caution. Deleting this project will permanently wipe all tasks, sprints, and team member associations.
              </p>
            </div>
          </div>
          <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h3 className="font-semibold text-sm mb-1">Delete this project</h3>
              <p className="text-xs text-foreground/50">Once deleted, it cannot be recovered.</p>
            </div>
            <button 
              onClick={handleDeleteProject}
              disabled={deleting}
              className="flex-shrink-0 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium disabled:opacity-50"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {deleting ? "Deleting..." : "Delete Project"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}