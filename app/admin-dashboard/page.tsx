"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Users,
  FolderKanban,
  KeyRound,
  CheckCircle2,
  Clock,
  Trash2,
  Mail,
  Search,
  ArrowLeft,
  Loader2,
  AlertCircle,
  BarChart3,
  UserCheck,
  Briefcase,
  RefreshCw,
} from "lucide-react";

type UserDirectoryRow = {
  id: string;
  email: string;
  created_at: string;
  is_admin: boolean;
  primaryRole: "Admin" | "Project Manager" | "Member" | "No Project";
  memberships: {
    projectId: string;
    projectName: string;
    role: string;
    nickname: string | null;
  }[];
  totalTasks: number;
  doneTasks: number;
};

function AdminDashboardContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [setupWarning, setSetupWarning] = useState<string | null>(null);

  const [users, setUsers] = useState<UserDirectoryRow[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [projectsSummary, setProjectsSummary] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    totalUsers: 0,
    projectManagers: 0,
    membersOnly: 0,
    totalProjects: 0,
    activeSprints: 0,
    totalTasks: 0,
    doneTasks: 0,
    completionRate: 0,
    pendingResets: 0,
  });

  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [resetFilter, setResetFilter] = useState<"all" | "pending" | "resolved">("all");
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const checkAuthAndFetch = async () => {
    setLoading(true);
    setSetupWarning(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }

    const adminEmailEnv = (
      process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
      process.env.NEXT_PUBLIC_OWNER_EMAIL ||
      ""
    ).toLowerCase();

    // Check is_admin in profiles
    let isAdminProfile = false;
    const { data: myProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userData.user.id)
      .single();

    if (!profileErr && myProfile?.is_admin) {
      isAdminProfile = true;
    }

    const isEmailMatch =
      !!adminEmailEnv && userData.user.email?.toLowerCase() === adminEmailEnv;

    if (!isAdminProfile && !isEmailMatch) {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    setAuthorized(true);
    await fetchAdminData();
    setLoading(false);
  };

  const fetchAdminData = async () => {
    // 1. Fetch all profiles (fallback if is_admin column isn't added yet)
    let profilesData: any[] = [];
    const { data: pWithAdmin, error: pAdminErr } = await supabase
      .from("profiles")
      .select("id, email, created_at, is_admin")
      .order("created_at", { ascending: false });

    if (pAdminErr) {
      setSetupWarning(
        "Some admin columns/tables are missing. Run the Admin SQL script in Supabase to enable full RLS and reset requests."
      );
      const { data: pBasic } = await supabase
        .from("profiles")
        .select("id, email, created_at")
        .order("created_at", { ascending: false });
      profilesData = (pBasic || []).map((p) => ({ ...p, is_admin: false }));
    } else {
      profilesData = pWithAdmin || [];
    }

    // 2. Fetch projects, memberships, sprints, tasks, backlog_tasks
    const [
      { data: projectsData },
      { data: membersData },
      { data: sprintsData },
      { data: sprintTasksData },
      { data: backlogTasksData },
      { data: resetsData, error: resetsErr },
    ] = await Promise.all([
      supabase.from("projects").select("id, name, created_at").order("created_at", { ascending: false }),
      supabase.from("project_members").select("id, project_id, user_id, role, nickname, projects(id, name)"),
      supabase.from("sprints").select("id, project_id, is_current"),
      supabase.from("tasks").select("id, project_id, status, assigned_to"),
      supabase.from("backlog_tasks").select("id, project_id, status, assigned_to"),
      supabase.from("password_reset_requests").select("*").order("created_at", { ascending: false }),
    ]);

    if (resetsErr) {
      setSetupWarning((prev) =>
        prev || "Table 'password_reset_requests' not found yet. Run the SQL script to track forgot-password requests."
      );
    }

    const allProjects = projectsData || [];
    const allMembers = membersData || [];
    const allSprints = sprintsData || [];
    const allTasks = [...(sprintTasksData || []), ...(backlogTasksData || [])];
    const allResets = resetsData || [];

    setResetRequests(allResets);

    // Build user directory
    let pmCount = 0;
    let memberOnlyCount = 0;

    const directory: UserDirectoryRow[] = profilesData.map((profile) => {
      const userMemberships = allMembers
        .filter((m) => m.user_id === profile.id)
        .map((m) => ({
          projectId: m.project_id,
          projectName:
            (m.projects as any)?.name ||
            (m.projects as any[])?.[0]?.name ||
            "Unknown Project",
          role: m.role,
          nickname: m.nickname,
        }));

      const hasPMRole = userMemberships.some((m) => m.role === "Project Manager");
      let primaryRole: UserDirectoryRow["primaryRole"] = "No Project";

      if (profile.is_admin) {
        primaryRole = "Admin";
      } else if (hasPMRole) {
        primaryRole = "Project Manager";
        pmCount++;
      } else if (userMemberships.length > 0) {
        primaryRole = "Member";
        memberOnlyCount++;
      }

      const assignedTasks = allTasks.filter((t) => t.assigned_to === profile.id);
      const doneAssigned = assignedTasks.filter((t) => t.status === "done").length;

      return {
        id: profile.id,
        email: profile.email,
        created_at: profile.created_at,
        is_admin: !!profile.is_admin,
        primaryRole,
        memberships: userMemberships,
        totalTasks: assignedTasks.length,
        doneTasks: doneAssigned,
      };
    });

    setUsers(directory);

    // Build projects summary
    const projRows = allProjects.map((proj) => {
      const pMembers = allMembers.filter((m) => m.project_id === proj.id);
      const pTasks = allTasks.filter((t) => t.project_id === proj.id);
      const pDone = pTasks.filter((t) => t.status === "done").length;
      const pActiveSprints = allSprints.filter(
        (s) => s.project_id === proj.id && s.is_current
      ).length;
      const pm = pMembers.find((m) => m.role === "Project Manager");
      const pmProfile = profilesData.find((u) => u.id === pm?.user_id);

      return {
        id: proj.id,
        name: proj.name,
        pmEmail: pmProfile?.email || "—",
        memberCount: pMembers.length,
        totalTasks: pTasks.length,
        doneTasks: pDone,
        completion: pTasks.length === 0 ? 0 : Math.round((pDone / pTasks.length) * 100),
        activeSprints: pActiveSprints,
      };
    });

    setProjectsSummary(projRows);

    const totalTasks = allTasks.length;
    const doneTasks = allTasks.filter((t) => t.status === "done").length;
    const completionRate = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
    const activeSprints = allSprints.filter((s) => s.is_current).length;
    const pendingResets = allResets.filter((r) => r.status === "pending").length;

    setKpis({
      totalUsers: profilesData.length,
      projectManagers: pmCount,
      membersOnly: memberOnlyCount,
      totalProjects: allProjects.length,
      activeSprints,
      totalTasks,
      doneTasks,
      completionRate,
      pendingResets,
    });
  };

  const handleToggleResetStatus = async (req: any) => {
    setActionBusyId(req.id);
    const nextStatus = req.status === "pending" ? "resolved" : "pending";
    const { error } = await supabase
      .from("password_reset_requests")
      .update({ status: nextStatus })
      .eq("id", req.id);

    if (!error) {
      setResetRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: nextStatus } : r))
      );
      setKpis((prev) => ({
        ...prev,
        pendingResets:
          nextStatus === "resolved" ? Math.max(0, prev.pendingResets - 1) : prev.pendingResets + 1,
      }));
      showToast(`Request marked as ${nextStatus}.`);
    } else {
      alert("Error updating request: " + error.message);
    }
    setActionBusyId(null);
  };

  const handleSendResetEmail = async (req: any) => {
    setActionBusyId(req.id);
    const { error } = await supabase.auth.resetPasswordForEmail(req.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      alert("Failed to send reset email: " + error.message);
    } else {
      showToast(`Password reset email sent to ${req.email}.`);
    }
    setActionBusyId(null);
  };

  const handleDeleteResetRequest = async (id: string) => {
    if (!confirm("Delete this forgot-password request?")) return;
    setActionBusyId(id);
    const target = resetRequests.find((r) => r.id === id);
    const { error } = await supabase
      .from("password_reset_requests")
      .delete()
      .eq("id", id);

    if (!error) {
      setResetRequests((prev) => prev.filter((r) => r.id !== id));
      if (target?.status === "pending") {
        setKpis((prev) => ({ ...prev, pendingResets: Math.max(0, prev.pendingResets - 1) }));
      }
      showToast("Request deleted.");
    }
    setActionBusyId(null);
  };

  const getRoleBadgeClasses = (role: UserDirectoryRow["primaryRole"]) => {
    switch (role) {
      case "Admin":
        return "bg-purple-500/15 text-purple-500 border-purple-500/30";
      case "Project Manager":
        return "bg-accent/15 text-accent border-accent/30";
      case "Member":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-foreground/10 text-foreground/60 border-border";
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    const matchesSearch =
      u.email.toLowerCase().includes(q) ||
      u.memberships.some((m) => m.projectName.toLowerCase().includes(q));
    const matchesRole = roleFilter === "All" || u.primaryRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredResets = resetRequests.filter(
    (r) => resetFilter === "all" || r.status === resetFilter
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-accent w-8 h-8" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full p-8 border border-border rounded-xl bg-surface text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-sm text-foreground/60">
            This admin dashboard is restricted to the designated owner account.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center border border-accent/20">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-foreground/60">
                Global system KPIs, user directory, and forgot-password requests.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={checkAuthAndFetch}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-border bg-surface hover:border-accent rounded-md transition-colors"
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-md transition-colors"
            >
              <ArrowLeft size={15} /> My Projects
            </Link>
          </div>
        </div>

        {toastMsg && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 size={16} /> {toastMsg}
          </div>
        )}

        {setupWarning && (
          <div className="p-4 bg-orange-500/10 border border-orange-500/30 text-orange-500 rounded-xl text-sm flex items-start gap-3">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <span>{setupWarning}</span>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 bg-surface border border-border rounded-xl">
            <div className="flex items-center justify-between text-foreground/60 mb-2">
              <span className="text-sm font-medium">Total Users</span>
              <Users size={18} className="text-accent" />
            </div>
            <p className="text-3xl font-bold">{kpis.totalUsers}</p>
            <p className="text-xs text-foreground/60 mt-2">
              {kpis.projectManagers} Project Managers · {kpis.membersOnly} Members
            </p>
          </div>

          <div className="p-5 bg-surface border border-border rounded-xl">
            <div className="flex items-center justify-between text-foreground/60 mb-2">
              <span className="text-sm font-medium">Projects & Sprints</span>
              <FolderKanban size={18} className="text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{kpis.totalProjects}</p>
            <p className="text-xs text-foreground/60 mt-2">
              {kpis.activeSprints} Active Sprints running
            </p>
          </div>

          <div className="p-5 bg-surface border border-border rounded-xl">
            <div className="flex items-center justify-between text-foreground/60 mb-2">
              <span className="text-sm font-medium">Global Task Completion</span>
              <BarChart3 size={18} className="text-green-500" />
            </div>
            <p className="text-3xl font-bold">{kpis.completionRate}%</p>
            <p className="text-xs text-foreground/60 mt-2">
              {kpis.doneTasks} / {kpis.totalTasks} tasks completed
            </p>
          </div>

          <div
            className={`p-5 border rounded-xl ${
              kpis.pendingResets > 0
                ? "bg-orange-500/10 border-orange-500/30"
                : "bg-surface border-border"
            }`}
          >
            <div className="flex items-center justify-between text-foreground/60 mb-2">
              <span className="text-sm font-medium">Pending Password Resets</span>
              <KeyRound
                size={18}
                className={kpis.pendingResets > 0 ? "text-orange-500" : "text-foreground/50"}
              />
            </div>
            <p className="text-3xl font-bold">{kpis.pendingResets}</p>
            <p className="text-xs text-foreground/60 mt-2">
              {resetRequests.length} total requests logged
            </p>
          </div>
        </div>

        {/* Forgot Password Requests */}
        <section className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <KeyRound size={18} className="text-accent" />
              <div>
                <h2 className="text-lg font-bold">Forgot Password Requests</h2>
                <p className="text-xs text-foreground/60">
                  Users who requested a password reset or owner notification.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(["all", "pending", "resolved"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setResetFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border capitalize transition-colors ${
                    resetFilter === tab
                      ? "bg-accent text-white border-accent"
                      : "bg-background border-border text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead className="bg-background/60 border-b border-border text-xs uppercase text-foreground/60">
                <tr>
                  <th className="p-4 font-semibold">User Email</th>
                  <th className="p-4 font-semibold">Requested At</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-sm">
                {filteredResets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-foreground/50">
                      No forgot-password requests found.
                    </td>
                  </tr>
                ) : (
                  filteredResets.map((req) => (
                    <tr key={req.id} className="hover:bg-background/40 transition-colors">
                      <td className="p-4 font-medium">{req.email}</td>
                      <td className="p-4 text-foreground/60 text-xs">
                        {new Date(req.created_at).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border uppercase ${
                            req.status === "resolved"
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                          }`}
                        >
                          {req.status === "resolved" ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <Clock size={12} />
                          )}
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleSendResetEmail(req)}
                          disabled={actionBusyId === req.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-background border border-border hover:border-accent hover:text-accent rounded-md transition-colors disabled:opacity-50"
                          title="Send Supabase Reset Email"
                        >
                          <Mail size={13} /> Send Reset Email
                        </button>
                        <button
                          onClick={() => handleToggleResetStatus(req)}
                          disabled={actionBusyId === req.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-background border border-border hover:border-green-500 hover:text-green-500 rounded-md transition-colors disabled:opacity-50"
                        >
                          {req.status === "pending" ? "Mark Resolved" : "Reopen"}
                        </button>
                        <button
                          onClick={() => handleDeleteResetRequest(req.id)}
                          disabled={actionBusyId === req.id}
                          className="inline-flex items-center p-1.5 text-foreground/50 hover:text-red-500 rounded-md transition-colors disabled:opacity-50"
                          title="Delete Request"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* All Users Directory */}
        <section className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <UserCheck size={18} className="text-accent" />
              <div>
                <h2 className="text-lg font-bold">All Users ({filteredUsers.length})</h2>
                <p className="text-xs text-foreground/60">
                  Admins, Project Managers, and Members across all workspaces.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
                />
                <input
                  type="text"
                  placeholder="Search email or project..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-accent"
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Project Manager">Project Managers</option>
                <option value="Member">Members</option>
                <option value="No Project">No Project</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-background/60 border-b border-border text-xs uppercase text-foreground/60">
                <tr>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">Classification</th>
                  <th className="p-4 font-semibold">Projects & Roles</th>
                  <th className="p-4 font-semibold">Assigned Tasks</th>
                  <th className="p-4 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-sm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-foreground/50">
                      No matching users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-background/40 transition-colors">
                      <td className="p-4 font-medium break-all">{user.email}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getRoleBadgeClasses(
                            user.primaryRole
                          )}`}
                        >
                          {user.primaryRole}
                        </span>
                      </td>
                      <td className="p-4">
                        {user.memberships.length === 0 ? (
                          <span className="text-xs text-foreground/40 italic">
                            Not in any project
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {user.memberships.map((m, idx) => (
                              <span
                                key={`${m.projectId}-${idx}`}
                                className="text-[11px] px-2 py-0.5 rounded-md bg-background border border-border text-foreground/80"
                              >
                                <strong>{m.projectName}</strong> · {m.role}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-4 whitespace-nowrap text-xs text-foreground/70">
                        {user.doneTasks} / {user.totalTasks} done
                      </td>
                      <td className="p-4 whitespace-nowrap text-xs text-foreground/60">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Projects Overview KPI Table */}
        <section className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Briefcase size={18} className="text-accent" />
            <div>
              <h2 className="text-lg font-bold">Projects Overview ({projectsSummary.length})</h2>
              <p className="text-xs text-foreground/60">
                Health and task progress across every project.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-background/60 border-b border-border text-xs uppercase text-foreground/60">
                <tr>
                  <th className="p-4 font-semibold">Project Name</th>
                  <th className="p-4 font-semibold">Project Manager</th>
                  <th className="p-4 font-semibold">Members</th>
                  <th className="p-4 font-semibold">Active Sprints</th>
                  <th className="p-4 font-semibold">Task Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-sm">
                {projectsSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-foreground/50">
                      No projects created yet.
                    </td>
                  </tr>
                ) : (
                  projectsSummary.map((proj) => (
                    <tr key={proj.id} className="hover:bg-background/40 transition-colors">
                      <td className="p-4 font-semibold">{proj.name}</td>
                      <td className="p-4 text-xs text-foreground/70">{proj.pmEmail}</td>
                      <td className="p-4 text-xs">{proj.memberCount}</td>
                      <td className="p-4 text-xs">{proj.activeSprints}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-28 h-2 bg-background rounded-full overflow-hidden border border-border">
                            <div
                              className="h-full bg-accent"
                              style={{ width: `${proj.completion}%` }}
                            />
                          </div>
                          <span className="text-xs text-foreground/70 whitespace-nowrap">
                            {proj.completion}% ({proj.doneTasks}/{proj.totalTasks})
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="animate-spin text-accent w-8 h-8" />
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}