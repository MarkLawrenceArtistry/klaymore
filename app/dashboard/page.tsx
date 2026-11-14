"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderKanban,
  Loader2,
  Settings,
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

function DashboardContent() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Change Password Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    setProjects([]);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }

    setUserEmail(userData.user.email || "");

    const { data, error } = await supabase
      .from("project_members")
      .select("role, projects(id, name, description, created_at)")
      .eq("user_id", userData.user.id);

    if (!error && data) {
      const formattedProjects = data
        .map((item: any) => ({
          ...item.projects,
          myRole: item.role,
        }))
        .filter((p) => p && p.id);
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

  const openPasswordModal = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setPasswordSuccess(null);
    setIsSettingsOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      // Verify current password first
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });
      if (verifyError) {
        throw new Error("Current password is incorrect.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
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

        <div className="flex items-center gap-4">
          <button
            onClick={openPasswordModal}
            className="p-2 text-foreground/60 hover:text-foreground hover:bg-surface border border-transparent hover:border-border rounded-md transition-colors"
            title="Account Settings (Change Password)"
            aria-label="Account Settings"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-foreground/60 hover:text-foreground"
          >
            Sign Out
          </button>
        </div>
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
            <p className="text-foreground/60 text-sm mb-4">
              Create your first project to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => (window.location.href = `/project/${project.id}/dashboard`)}
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
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="e.g. Website Redesign 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent resize-none h-24"
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

      {isSettingsOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="bg-background border border-border rounded-xl p-6 w-full max-w-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-accent" />
                <h2 className="text-xl font-bold">Account Settings</h2>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 text-foreground/50 hover:text-foreground rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-surface border border-border rounded-md text-xs text-foreground/70">
              Signed in as <strong className="text-foreground">{userEmail}</strong>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md text-sm flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-md text-sm flex items-start gap-2">
                <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
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
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface border border-border rounded-md transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {changingPassword ? "Updating..." : "Change Password"}
                </button>
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="animate-spin text-accent w-8 h-8" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}