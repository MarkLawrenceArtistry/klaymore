"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { Filter, Search, CalendarDays, Edit2, Trash2, Clock } from "lucide-react";

export default function RoadmapPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [sprints, setSprints] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("member");
  const [loading, setLoading] = useState(true);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // CRUD Modals
  const [editingSprint, setEditingSprint] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (projectId) fetchRoadmapData();
  }, [projectId]);

  const fetchRoadmapData = async () => {
    setLoading(true);

    // Get current user role
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const { data: memberData } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", userData.user.id)
        .single();
      if (memberData) setCurrentUserRole(memberData.role);
    }

    // Fetch Sprints and Tasks to calculate progress
    const { data: sprintsData, error } = await supabase
      .from("sprints")
      .select(`*, tasks (id, status)`)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (!error && sprintsData) {
      // Calculate progress for each sprint
      const processedSprints = sprintsData.map(sprint => {
        const total = sprint.tasks?.length || 0;
        const done = sprint.tasks?.filter((t: any) => t.status === 'done').length || 0;
        const progress = total === 0 ? 0 : Math.round((done / total) * 100);
        return { ...sprint, progress, totalTasks: total, doneTasks: done };
      });
      setSprints(processedSprints);
    }
    setLoading(false);
  };

  // --- CRUD (Update & Delete) for Project Manager ---
  const handleUpdateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    const { error } = await supabase
      .from("sprints")
      .update({
        title: editingSprint.title,
        description: editingSprint.description,
        end_date: editingSprint.end_date,
        is_current: editingSprint.is_current
      })
      .eq("id", editingSprint.id);

    if (!error) {
      setEditingSprint(null);
      fetchRoadmapData();
    }
    setUpdating(false);
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!confirm("Are you sure you want to delete this sprint? All tasks inside will be permanently deleted.")) return;
    
    const { error } = await supabase.from("sprints").delete().eq("id", sprintId);
    if (!error) setSprints(prev => prev.filter(s => s.id !== sprintId));
  };

  // --- Timeline Calculations ---
  const filteredSprints = sprints.filter(sprint => 
    sprint.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  let minTime = 0;
  let maxTime = 0;
  let totalDuration = 0;
  let timelineMarkers: { label: string, percent: number }[] = [];

  if (filteredSprints.length > 0) {
    // Find the earliest start date and latest end date
    const startDates = filteredSprints.map(s => new Date(s.created_at).getTime());
    const endDates = filteredSprints.map(s => new Date(s.end_date).getTime());
    
    // Add a 3-day buffer to start and end for visual padding
    minTime = Math.min(...startDates) - (3 * 24 * 60 * 60 * 1000);
    maxTime = Math.max(...endDates) + (3 * 24 * 60 * 60 * 1000);
    totalDuration = maxTime - minTime;

    // Create 5 timeline markers (0%, 25%, 50%, 75%, 100%)
    for (let i = 0; i <= 4; i++) {
      const time = minTime + (totalDuration * (i / 4));
      timelineMarkers.push({
        label: new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        percent: i * 25
      });
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Roadmap</h1>
          <p className="text-sm text-foreground/60">Gantt chart timeline of your sprints.</p>
        </div>
      </div>

      {/* Toggleable Filters */}
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
                placeholder="Search sprints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Gantt Chart Area */}
      <div className="flex-1 bg-background border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-foreground/50">Loading roadmap...</div>
        ) : filteredSprints.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <CalendarDays className="w-12 h-12 text-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No sprints to display</h3>
            <p className="text-foreground/60 text-sm">Create sprints in the Sprints page to see them on the timeline.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar relative flex flex-col">
            
            {/* Timeline Header */}
            <div className="sticky top-0 z-20 flex bg-surface border-b border-border text-xs text-foreground/60 font-medium">
              <div className="w-64 flex-shrink-0 p-4 border-r border-border bg-surface">Sprint Name</div>
              <div className="flex-1 relative min-w-[500px]">
                {timelineMarkers.map((marker, i) => (
                  <div 
                    key={i} 
                    className="absolute top-0 bottom-0 border-l border-border/50 pl-2 pt-4"
                    style={{ left: `${marker.percent}%` }}
                  >
                    {marker.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Sprints Rows */}
            <div className="relative min-w-[500px]">
              {/* Background Grid Lines */}
              <div className="absolute inset-0 z-0 pointer-events-none">
                {timelineMarkers.map((marker, i) => (
                  <div 
                    key={i} 
                    className="absolute top-0 bottom-0 border-l border-border/30"
                    style={{ left: `${marker.percent}%` }}
                  />
                ))}
              </div>

              {filteredSprints.map((sprint) => {
                const start = new Date(sprint.created_at).getTime();
                const end = new Date(sprint.end_date).getTime();
                const leftPercent = ((start - minTime) / totalDuration) * 100;
                let widthPercent = ((end - start) / totalDuration) * 100;
                
                // Ensure min width for 1-day sprints so they remain visible and clickable
                if (widthPercent < 2) widthPercent = 2; 

                return (
                  <div key={sprint.id} className="flex border-b border-border/50 hover:bg-surface/50 transition-colors group">
                    {/* Sidebar / Row Label */}
                    <div className="w-64 flex-shrink-0 p-4 border-r border-border bg-background flex flex-col justify-center sticky left-0 z-10">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm truncate pr-2">{sprint.title}</span>
                        {currentUserRole === 'Project Manager' && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingSprint(sprint)} className="p-1 text-foreground/50 hover:text-accent rounded"><Edit2 size={12} /></button>
                            <button onClick={() => handleDeleteSprint(sprint.id)} className="p-1 text-foreground/50 hover:text-red-500 rounded"><Trash2 size={12} /></button>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-foreground/50 mt-1 flex items-center gap-1">
                        <Clock size={10} /> {new Date(sprint.end_date).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Timeline Bar */}
                    <div className="flex-1 relative p-3 z-10">
                      <div 
                        className={`absolute top-1/2 transform -translate-y-1/2 h-8 rounded-md shadow-sm overflow-hidden flex items-center px-2 cursor-pointer transition-all hover:-translate-y-1/2 hover:scale-[1.02] ${
                          sprint.is_current 
                            ? 'bg-accent/20 border border-accent/40 text-accent-hover' 
                            : 'bg-surface border border-border text-foreground/60 grayscale'
                        }`}
                        style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                        onClick={() => currentUserRole === 'Project Manager' && setEditingSprint(sprint)}
                        title={`${sprint.title} (${sprint.progress}% done)`}
                      >
                        {/* Progress Fill */}
                        <div 
                          className={`absolute left-0 top-0 bottom-0 opacity-20 ${sprint.is_current ? 'bg-accent' : 'bg-foreground'}`} 
                          style={{ width: `${sprint.progress}%` }} 
                        />
                        <span className="relative z-10 text-[10px] font-bold whitespace-nowrap truncate w-full">
                          {sprint.progress}% ({sprint.doneTasks}/{sprint.totalTasks})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit Sprint Modal */}
      {editingSprint && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-lg shadow-lg my-8">
            <h2 className="text-xl font-bold mb-6">Edit Sprint</h2>
            <form onSubmit={handleUpdateSprint} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Sprint Title</label>
                <input type="text" required value={editingSprint.title} onChange={(e) => setEditingSprint({ ...editingSprint, title: e.target.value })} className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea required value={editingSprint.description} onChange={(e) => setEditingSprint({ ...editingSprint, description: e.target.value })} className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:border-accent resize-none h-24" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input type="date" required value={editingSprint.end_date} onChange={(e) => setEditingSprint({ ...editingSprint, end_date: e.target.value })} className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:border-accent" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editingSprint.is_current} 
                      onChange={(e) => setEditingSprint({...editingSprint, is_current: e.target.checked})}
                      className="w-4 h-4 accent-accent"
                    />
                    <span className="text-sm font-medium">Active Sprint</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
                <button type="button" onClick={() => setEditingSprint(null)} className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface border border-transparent hover:border-border rounded-md transition-colors">Cancel</button>
                <button type="submit" disabled={updating} className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50">{updating ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}