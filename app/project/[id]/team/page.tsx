// app/project/[id]/team/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Copy, Filter, Search, Edit2, CheckCircle2, UserPlus } from "lucide-react";
import { useParams } from "next/navigation"; // Added hook

export default function TeamPage() {
  const params = useParams();
  const projectId = params.id as string; // Get ID safely from hook

  const [members, setMembers] = useState<any[]>([]);
  const [inviteToken, setInviteToken] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  // Edit Modal States
  const [editingMember, setEditingMember] = useState<any>(null);
  const [newNickname, setNewNickname] = useState("");
  const [newRole, setNewRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!projectId) return; // Prevent querying with "undefined"
    fetchTeamData();
  }, [projectId]);

  const fetchTeamData = async () => {
    setLoading(true);
    
    // 1. Get Project Invite Token
    const { data: project, error: pError } = await supabase
      .from("projects")
      .select("invite_token")
      .eq("id", projectId)
      .single();
      
    if (project) setInviteToken(project.invite_token);
    if (pError) console.error("Project Fetch Error:", pError);

    // 2. Get Team Members + their emails from profiles
    const { data: teamData, error: tError } = await supabase
      .from("project_members")
      .select("*, profiles(email)")
      .eq("project_id", projectId)
      .order("joined_at", { ascending: true });

    if (teamData) setMembers(teamData);
    if (tError) console.error("Team Fetch Error:", tError);
    
    setLoading(false);
  };

  const handleCopyInvite = () => {
    if (!inviteToken) {
      alert("Invite token not loaded yet. Please refresh.");
      return;
    }
    const inviteUrl = `${window.location.origin}/invite/${inviteToken}`;
    navigator.clipboard.writeText(inviteUrl);
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
      fetchTeamData(); // Refresh table
    }
    setSaving(false);
  };

  // Apply Search and Filters
  const filteredMembers = members.filter((m) => {
    const matchesSearch = 
      (m.nickname?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
      (m.profiles?.email?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "All" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Extract unique roles for the dropdown filter
  const uniqueRoles = ["All", ...Array.from(new Set(members.map(m => m.role)))];

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Members</h1>
          <p className="text-sm text-foreground/60">Manage roles, nicknames, and project access.</p>
        </div>
        
        <button 
          onClick={handleCopyInvite}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
        >
          {copied ? <CheckCircle2 size={16} /> : <UserPlus size={16} />}
          {copied ? "Copied!" : "Copy Invite Link"}
        </button>
      </div>

      {/* Toggleable Filters Section */}
      <div className="mb-6">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors mb-4"
        >
          <Filter size={16} />
          {showFilters ? "Hide Filters" : "See Filters"}
        </button>

        {showFilters && (
          <div className="flex gap-4 p-4 bg-surface border border-border rounded-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/40" />
              <input 
                type="text" 
                placeholder="Search by email or nickname..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-background border border-border rounded-md text-sm px-3 py-2 focus:outline-none focus:border-accent"
            >
              {uniqueRoles.map(role => (
                <option key={role as string} value={role as string}>{role}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Team Table */}
      <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-border text-sm text-foreground/70">
                <th className="p-4 font-medium">User Email</th>
                <th className="p-4 font-medium">Nickname</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Joined</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-foreground/50">Loading team data...</td></tr>
              ) : filteredMembers.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-foreground/50">No members found.</td></tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                    <td className="p-4 text-sm">{member.profiles?.email || "Unknown User"}</td>
                    <td className="p-4 text-sm font-medium">{member.nickname || "—"}</td>
                    <td className="p-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        member.role === 'Project Manager' ? 'bg-accent/10 text-accent' : 'bg-border text-foreground/70'
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-foreground/60">
                      {new Date(member.joined_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => {
                          setEditingMember(member);
                          setNewNickname(member.nickname || "");
                          setNewRole(member.role);
                        }}
                        className="p-2 text-foreground/50 hover:text-accent transition-colors rounded-md hover:bg-accent/10 inline-flex"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-4">Edit Team Member</h2>
            <p className="text-sm text-foreground/60 mb-6">{editingMember.profiles?.email}</p>
            
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nickname</label>
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-background focus:outline-none focus:border-accent"
                  placeholder="e.g. Frontend Wizard"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <input
                  type="text"
                  required
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-background focus:outline-none focus:border-accent"
                  placeholder="e.g. Data Gatherer, Reviewer..."
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface border border-transparent hover:border-border rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}