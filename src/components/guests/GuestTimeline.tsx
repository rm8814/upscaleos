"use client";

import React from "react";
import { Calendar, MessageSquare, Star, AlertCircle, CheckCircle2 } from "lucide-react";

interface TimelineEvent {
  date: string;
  type: "stay" | "note" | "incident" | "preference";
  title: string;
  description: string;
  status?: string;
}

interface GuestTimelineProps {
  guestId: string;
  events: TimelineEvent[];
}

export default function GuestTimeline({ events }: GuestTimelineProps) {
  return (
    <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
      {events.map((event, i) => (
        <div key={i} className="relative">
          {/* Dot */}
          <div className={`absolute -left-[25px] top-1 w-3 h-3 rounded-full border-2 border-ink ${
            event.type === "stay" ? "bg-accent-cyan" :
            event.type === "note" ? "bg-accent-violet" :
            event.type === "incident" ? "bg-room-ooo" :
            "bg-room-inspected"
          }`} />

          <div className="bg-deep border border-border p-4 rounded-2xl hover:border-accent-violet transition-all group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-fg-3">{event.date}</span>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                  event.type === "stay" ? "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30" :
                  event.type === "note" ? "bg-accent-violet/10 text-accent-violet border-accent-violet/30" :
                  event.type === "incident" ? "bg-room-ooo/10 text-room-ooo border-room-ooo/30" :
                  "bg-room-inspected/10 text-room-inspected border-room-inspected/30"
                }`}>
                  {event.type}
                </span>
              </div>
              {event.status && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-ice uppercase">
                  <CheckCircle2 className="w-3 h-3 text-accent-cyan" /> {event.status}
                </div>
              )}
            </div>
            <h4 className="text-sm font-bold text-ice mb-1 group-hover:text-accent-cyan transition-colors">{event.title}</h4>
            <p className="text-xs text-fg-3 leading-relaxed">{event.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
