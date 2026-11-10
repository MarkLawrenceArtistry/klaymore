"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, LogIn } from "lucide-react";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<{ id: string; name: string } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAlreadyMember, setIsAlreadyMember] = useState(false);

  useEffect(() => {
    if (token) {
      validateInvite();
    }
  }, [token]);

  const validateInvite = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Check if user is logged in
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData?.user || null);

      // 2. Fetch the project using the token
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("invite_token", token)
        .single();

      if (projectError || !projectData) {
        throw new Error("Invalid or expired invite link.");
      }

      setProject(projectData);

      // 3. If logged in, check if already a member
      if (userData?.user) {
        const { data: memberData } = await supabase
          .from("project_members")
          .select("id")
          .eq("project_id", projectData.id)
          .eq("user_id", userData.user.id)
          .single();

        if (memberData) {
          setIsAlreadyMember(true);
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinProject = async () => {
    if (!user || !project) return;
    setJoining(true);

    const { error } = await supabase
      .from("project_members")
      .insert([
        {
          project_id: project.id,
          user_id: user.id,
          role: "member", // Default role, Project Manager can change this later
        },
      ]);

    if (error) {
      setError("Failed to join the project. Please try again.");
      setJoining(false);
    } else {
      // Successfully joined, redirect to project dashboard
      router.push(`/project/${project.id}/dashboard`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-accent w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 border border-border rounded-xl shadow-sm bg-surface text-center">
        
        <div className="w-16 h-16 bg-border rounded-xl mx-auto mb-6 flex items-center justify-center overflow-hidden">
          {/* Logo Placeholder */}
          <img src="/placeholder.png" alt="Logo" className="w-full h-full object-cover opacity-0" />
        </div>

        {error ? (
          <div>
            <div className="mx-auto w-12 h-12 bg-red-500/10 text-red-500 flex items-center justify-center rounded-full mb-4">
              <AlertCircle size={24} />
            </div>
            <h1 className="text-xl font-bold mb-2">Oops!</h1>
            <p className="text-foreground/70 mb-6">{error}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-2 px-4 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        ) : isAlreadyMember ? (
          <div>
            <div className="mx-auto w-12 h-12 bg-green-500/10 text-green-500 flex items-center justify-center rounded-full mb-4">
              <CheckCircle2 size={24} />
            </div>
            <h1 className="text-xl font-bold mb-2">You're already in!</h1>
            <p className="text-foreground/70 mb-6">
              You are already a member of <strong>{project?.name}</strong>.
            </p>
            <button
              onClick={() => router.push(`/project/${project?.id}/dashboard`)}
              className="w-full py-2 px-4 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors font-medium"
            >
              Open Project
            </button>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold mb-2">Project Invitation</h1>
            <p className="text-foreground/70 mb-8">
              You have been invited to join the project:<br/>
              <strong className="text-foreground text-lg mt-2 inline-block">{project?.name}</strong>
            </p>

            {!user ? (
              <div className="space-y-4">
                <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg text-sm text-accent mb-4">
                  You need to be logged in to accept this invitation.
                </div>
                <button
                  onClick={() => router.push("/login")}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors font-medium"
                >
                  <LogIn size={18} />
                  Log In or Register
                </button>
              </div>
            ) : (
              <button
                onClick={handleJoinProject}
                disabled={joining}
                className="w-full py-2 px-4 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {joining ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Joining...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}