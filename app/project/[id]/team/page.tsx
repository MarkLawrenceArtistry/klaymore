"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Copy, Filter, Search, Edit2, CheckCircle2, UserPlus, UserMinus } from "lucide-react";
import { useParams } from "next/navigation";

export default function TeamPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [members, setMembers] = useState<any[]>([]);
  const [inviteToken, setInviteToken] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("member");
  const [loading, setLoading] = useState(true);

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const [editingMember, setEditingMember] = useState<any>(null);
  const [newNickname, setNewNickname] = useState("");
  const [newRole, setNewRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (projectId) fetchTeamData();
  }, [projectId]);

  const fetchTeamData = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();

    const { data: project } = await supabase.from("projects").select("invite_token").eq("id", projectId).single();
    if (project) setInviteToken(project.invite_token);

    const { data: teamData } = await supabase
      .from("project_members")
      .select("*, profiles(email)")
      .eq("project_id", projectId)
      .order("joined_at", { ascending: true });

    if (teamData) {
      setMembers(teamData);
      if (userData?.user) {
        const me = teamData.find(m => m.user_id === userData.user.id);
        if (me) setCurrentUserRole(me.role);
      }
    }
    setLoading(false);
  };

  const handleCopyInvite = () => {
    if (!inviteToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/invite/${inviteToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setSaving(true);
    const { error } = await supabase
      .from("project_members")
      .update({ nickname: newNickname, role: newRole })
      .eq("id", editingMember.id);

    if (!error) {
      setEditingMember(null);
      fetchTeamData();
    }
    setSaving(false);
  };

  const handleKickMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to kick ${memberEmail} from the project?`)) return;
    const { error } = await supabase.from("project_members").delete().eq("id", memberId);
    if (!error) setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch = (m.nickname?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || (m.profiles?.email?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "All" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const uniqueRoles = ["All", ...Array.from(new Set(members.map(m => m.role)))];

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Members</h1>
          <p className="text-sm text-foreground/60">Manage roles, nicknames, and project access.</p>
        </div>
        <button onClick={handleCopyInvite} className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
          {copied ? <CheckCircle2 size={16} /> : <UserPlus size={16} />}
          {copied ? "Copied!" : "Copy Invite Link"}
        </button>
      </div>

      <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border text-sm text-foreground/70">
              <th className="p-4 font-medium">User Email</th>
              <th className="p-4 font-medium">Nickname</th>
              <th className="p-4 font-medium">Role</th>
              {currentUserRole === 'Project Manager' && <th className="p-4 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-foreground/50">Loading team data...</td></tr>
            ) : (
              filteredMembers.map((member) => (
                <tr key={member.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                  <td className="p-4 text-sm">{member.profiles?.email}</td>
                  <td className="p-4 text-sm font-medium">{member.nickname || "—"}</td>
                  <td className="p-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.role === 'Project Manager' ? 'bg-accent/10 text-accent' : 'bg-border text-foreground/70'}`}>
                      {member.role}
                    </span>
                  </td>
                  {/* ONLY PROJECT MANAGER CAN SEE THESE BUTTONS */}
                  {currentUserRole === 'Project Manager' && (
                    <td className="p-4 text-right">
                      <button
                        onClick={() => { setEditingMember(member); setNewNickname(member.nickname || ""); setNewRole(member.role); }}
                        className="p-2 text-foreground/50 hover:text-accent transition-colors rounded-md hover:bg-accent/10 inline-flex" title="Edit Role/Nickname"
                      >
                        <Edit2 size={16} />
                      </button>
                      {/* Prevent PM from easily kicking themselves accidentally */}
                      {member.role !== 'Project Manager' && (
                        <button
                          onClick={() => handleKickMember(member.id, member.profiles?.email)}
                          className="p-2 text-foreground/50 hover:text-red-500 transition-colors rounded-md hover:bg-red-500/10 inline-flex ml-2" title="Kick Member"
                        >
                          <UserMinus size={16} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-4">Edit Team Member</h2>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nickname</label>
                <input type="text" value={newNickname} onChange={(e) => setNewNickname(e.target.value)} className="w-full p-2 border border-border rounded-md bg-background focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <input type="text" required value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full p-2 border border-border rounded-md bg-background focus:outline-none focus:border-accent" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingMember(null)} className="px-4 py-2 text-sm font-medium border border-transparent hover:border-border rounded-md">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-md">{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}