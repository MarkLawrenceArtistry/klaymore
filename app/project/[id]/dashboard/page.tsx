// app/project/[id]/dashboard/page.tsx
"use client";

import { CheckCircle2, CircleDashed, Clock, Users } from "lucide-react";

export default function ProjectDashboard() {
  // Mock Data for now - we will connect this to Supabase later
  const kpis = {
    totalTasks: 124,
    completed: 82,
    pending: 42,
    efficiency: "66%",
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-foreground">Project Dashboard</h1>
        <button className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-surface transition">
          Filter Data
        </button>
      </div>

      {/* Top KPI Cards (Following 60-30-10 rule: White bg, gray border, purple accents) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-background border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-accent/10 rounded-lg text-accent">
              <ListTodo size={20} />
            </div>
            <h3 className="text-sm font-medium text-foreground/70">Total Tasks</h3>
          </div>
          <p className="text-3xl font-bold">{kpis.totalTasks}</p>
        </div>

        <div className="p-6 bg-background border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
              <CheckCircle2 size={20} />
            </div>
            <h3 className="text-sm font-medium text-foreground/70">Completed</h3>
          </div>
          <p className="text-3xl font-bold">{kpis.completed}</p>
        </div>

        <div className="p-6 bg-background border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-600">
              <CircleDashed size={20} />
            </div>
            <h3 className="text-sm font-medium text-foreground/70">Pending</h3>
          </div>
          <p className="text-3xl font-bold">{kpis.pending}</p>
        </div>

        <div className="p-6 bg-background border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-accent/10 rounded-lg text-accent">
              <Clock size={20} />
            </div>
            <h3 className="text-sm font-medium text-foreground/70">Deadline</h3>
          </div>
          <p className="text-xl font-bold mt-2">Oct 24, 2025</p>
        </div>
      </div>

      {/* Bottom Section: Charts & Team Activity placeholers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 p-6 bg-background border border-border rounded-xl shadow-sm h-96 flex flex-col">
          <h3 className="font-bold mb-2">Sprint Velocity (Mock)</h3>
          <p className="text-sm text-foreground/60 mb-6">Task completion rate over time.</p>
          <div className="flex-1 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-foreground/40 bg-surface">
            [ Bar Graph Area - Will implement Recharts here later ]
          </div>
        </div>

        {/* Team Workload */}
        <div className="p-6 bg-background border border-border rounded-xl shadow-sm h-96 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold">Team Workload</h3>
            <Users size={18} className="text-foreground/50" />
          </div>
          <div className="space-y-4">
            {/* Mock Team Members */}
            {[
              { name: "You (PM)", tasks: 12, percent: 80 },
              { name: "Data Gatherer", tasks: 8, percent: 55 },
              { name: "Developer", tasks: 5, percent: 35 },
            ].map((member, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{member.name}</span>
                  <span className="text-foreground/60">{member.tasks} tasks</span>
                </div>
                <div className="w-full bg-surface rounded-full h-2">
                  <div 
                    className="bg-accent h-2 rounded-full" 
                    style={{ width: `${member.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// We need to import ListTodo at the top of the file, I missed it in the block above!
import { ListTodo } from "lucide-react";