"use client";

import React, { useState } from "react";
import { CheckCircle, Clock, AlertTriangle, MapPin, ChevronRight, User, LogOut, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type TicketStatus = "Open" | "In Progress" | "Resolved";

interface Ticket {
  _id: string;
  title: string;
  location: string;
  priority: "High" | "Medium" | "Low";
  status: TicketStatus;
}

export default function TechnicianView() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const resolveTicket = useMutation(api.maintenance.resolveTicket);

  // In a real app, we'd use the useQuery here
  const [tickets, setTickets] = useState<Ticket[]>([
    { _id: "t1", title: "AC Leakage", location: "Room 201", priority: "High", status: "Open" },
    { _id: "t2", title: "Clogged Drain", location: "Room 104", priority: "High", status: "Open" },
    { _id: "t3", title: "Broken Light", location: "Hallway 2F", priority: "Medium", status: "In Progress" },
    { _id: "t4", title: "Wall Paint", location: "Lobby", priority: "Low", status: "Open" },
  ]);

  const handleResolve = async () => {
    if (!selectedTicket) return;
    try {
      await resolveTicket({ id: selectedTicket._id as any, notes: "Fixed by Budi" });
      setTickets(prev => prev.map(t => t._id === selectedTicket._id ? { ...t, status: "Resolved" as TicketStatus } : t));
      setSelectedTicket(null);
    } catch (e) {
      console.error("Failed to resolve ticket", e);
    }
  };

  return (
    <div className="min-h-screen bg-ink flex flex-col max-w-md mx-auto border-x border-border">
      {/* Header */}
      <header className="p-4 bg-deep border-b border-border flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-violet flex items-center justify-center text-ice font-bold">
            B
          </div>
          <div>
            <div className="text-sm font-bold text-ice">Budi Santoso</div>
            <div className="text-[10px] text-fg-3 uppercase tracking-wider">AC Technician</div>
          </div>
        </div>
        <button className="p-2 text-fg-3 hover:text-ice transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex p-2 gap-1 bg-deep border-b border-border">
        <button className="flex-1 py-2 text-xs font-bold rounded-lg bg-elevated text-accent-cyan">Pending</button>
        <button className="flex-1 py-2 text-xs font-bold rounded-lg text-fg-3">My Tasks</button>
        <button className="flex-1 py-2 text-xs font-bold rounded-lg text-fg-3">History</button>
      </div>

      {/* Ticket List */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-fg-3 uppercase tracking-widest">Open Issues ({tickets.filter(t => t.status !== "Resolved").length})</h2>
          <div className="flex items-center gap-1 text-[10px] text-accent-cyan font-bold">
            <Clock className="w-3 h-3" /> Live Sync
          </div>
        </div>

        {tickets.filter(t => t.status !== "Resolved").map((t) => (
          <div
            key={t._id}
            onClick={() => setSelectedTicket(t)}
            className="bg-deep border border-border p-4 rounded-2xl flex items-center justify-between active:scale-95 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${
                t.priority === "High" ? "bg-room-ooo/20 text-room-ooo" :
                t.priority === "Medium" ? "bg-room-vacant-dirty/20 text-room-vacant-dirty" :
                "bg-fg-3/10 text-fg-3"
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-ice">{t.title}</div>
                <div className="flex items-center gap-1 text-xs text-fg-3">
                  <MapPin className="w-3 h-3" /> {t.location}
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-fg-3" />
          </div>
        ))}
      </div>

      {/* Detail Overlay */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-deep border border-border rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-xs font-mono text-fg-3 mb-1">{selectedTicket._id}</div>
                <h3 className="text-xl font-bold text-ice">{selectedTicket.title}</h3>
                <div className="flex items-center gap-2 text-sm text-fg-3 mt-1">
                  <MapPin className="w-4 h-4" /> {selectedTicket.location}
                </div>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 text-fg-3 hover:text-ice transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-ink border border-border rounded-2xl">
                <div className="text-xs uppercase tracking-widest text-fg-3 font-bold mb-2">Work Notes</div>
                <textarea
                  placeholder="Describe the fix, parts used, etc..."
                  className="w-full bg-transparent border-none text-sm text-ice placeholder:text-fg-3 focus:ring-0 h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 p-4 bg-deep border border-border rounded-2xl text-sm font-bold text-ice hover:bg-elevated transition-colors">
                  <Clock className="w-4 h-4" /> Put on Hold
                </button>
                <button
                  onClick={handleResolve}
                  className="flex items-center justify-center gap-2 p-4 bg-accent-violet text-ice rounded-2xl text-sm font-bold hover:bg-accent-violet-hi transition-colors shadow-lg shadow-accent-violet/20"
                >
                  <CheckCircle className="w-4 h-4" /> Mark Fixed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
