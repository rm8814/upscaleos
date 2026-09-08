"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronDown, Upload, Download, ArrowRight, AlertTriangle } from "lucide-react";
import { Card, Eyebrow } from "@/components/upx/primitives";

interface Channel {
  name: string;
  status: "Connected" | "Degraded" | "Disconnected";
  ariPush: string;
  parity: string;
  parityOk: boolean;
  lastSync: string;
  roomTypes: string;
  errors: number;
  commission: string;
  bookings: string;
  revenue: string;
  reconnect?: boolean;
  errorLog?: string;
}

const CHANNELS: Channel[] = [
  { name: "Booking.com", status: "Connected", ariPush: "Every 5 min", parity: "In parity", parityOk: true, lastSync: "2 min ago", roomTypes: "4/4", errors: 0, commission: "15%", bookings: "62", revenue: "Rp 148,900,000" },
  { name: "Agoda", status: "Connected", ariPush: "Every 5 min", parity: "In parity", parityOk: true, lastSync: "4 min ago", roomTypes: "4/4", errors: 0, commission: "17%", bookings: "38", revenue: "Rp 79,400,000" },
  { name: "Expedia", status: "Degraded", ariPush: "Every 15 min", parity: "1 rate below", parityOk: false, lastSync: "38 min ago", roomTypes: "3/4", errors: 2, commission: "18%", bookings: "21", revenue: "Rp 41,200,000", errorLog: "Rate plan FLEX rejected — room type not mapped" },
  { name: "Traveloka", status: "Connected", ariPush: "Every 10 min", parity: "In parity", parityOk: true, lastSync: "7 min ago", roomTypes: "4/4", errors: 0, commission: "16%", bookings: "29", revenue: "Rp 52,800,000" },
  { name: "Airbnb", status: "Disconnected", ariPush: "Paused", parity: "—", parityOk: false, lastSync: "3 days ago", roomTypes: "0/4", errors: 1, commission: "3%", bookings: "0", revenue: "Rp 0", reconnect: true, errorLog: "OAuth token expired — re-authentication required" },
];

const STATUS_COLOR: Record<Channel["status"], string> = {
  Connected: "var(--accent-cyan)",
  Degraded: "var(--res-tentative)",
  Disconnected: "var(--room-ooo)",
};

const MAPPING = [
  { local: "Deluxe Twin · BAR", remote: "Deluxe Twin Room — Standard Rate", minStay: 1 },
  { local: "Double Queen · BAR", remote: "Superior Queen — Standard Rate", minStay: 1 },
  { local: "King Suite · BAR", remote: "King Suite — Flexible", minStay: 2 },
  { local: "Presidential Suite · BAR", remote: "Presidential — Flexible", minStay: 2 },
];

const GRID = "grid grid-cols-[1.2fr_0.9fr_0.9fr_1fr_0.9fr_0.8fr_0.7fr] gap-2.5 px-4";

export default function ChannelManagerPage() {
  const [expanded, setExpanded] = useState<string | null>("Expedia");

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-3 flex justify-end">
        <button className="rounded-sm bg-accent-violet px-3.5 py-2 text-[12.5px] font-medium text-ice hover:bg-accent-violet-hi">
          + Add channel
        </button>
      </div>

      <Card className="overflow-hidden p-0">
        <div
          className={`${GRID} border-b border-line py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3`}
        >
          <div>Channel</div>
          <div>Status</div>
          <div>ARI push</div>
          <div>Rate parity</div>
          <div>Last sync</div>
          <div>Room types</div>
          <div>Errors</div>
        </div>

        {CHANNELS.map((c) => {
          const isOpen = expanded === c.name;
          return (
            <div key={c.name}>
              <button
                onClick={() => setExpanded(isOpen ? null : c.name)}
                className={`${GRID} w-full items-center border-b border-line-soft py-3 text-left text-13 transition-colors hover:bg-elevated`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {isOpen ? (
                    <ChevronDown className="h-[13px] w-[13px] text-fg-3" />
                  ) : (
                    <ChevronRight className="h-[13px] w-[13px] text-fg-3" />
                  )}
                  {c.name}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-[7px] w-[7px] rounded-pill"
                    style={{ background: STATUS_COLOR[c.status] }}
                  />
                  {c.status}
                </div>
                <div className="text-12 text-fg-2">{c.ariPush}</div>
                <div
                  className="text-12"
                  style={{ color: c.parityOk ? "var(--accent-cyan)" : "var(--res-tentative)" }}
                >
                  {c.parity}
                </div>
                <div className="text-12 text-fg-3">{c.lastSync}</div>
                <div className="font-mono">{c.roomTypes}</div>
                <div
                  className="font-mono"
                  style={{ color: c.errors > 0 ? "var(--room-ooo)" : "var(--fg-3)" }}
                >
                  {c.errors}
                </div>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-3.5 border-b border-line-soft bg-deep p-4">
                  <div className="flex flex-wrap gap-2">
                    <button className="flex items-center gap-1.5 rounded-sm border border-line bg-fg-1/[0.06] px-3 py-1.5 text-12 hover:border-line-strong">
                      <Upload className="h-[13px] w-[13px]" /> Push rates &amp; inventory now
                    </button>
                    <button className="flex items-center gap-1.5 rounded-sm border border-line bg-fg-1/[0.06] px-3 py-1.5 text-12 hover:border-line-strong">
                      <Download className="h-[13px] w-[13px]" /> Pull bookings now
                    </button>
                    {c.reconnect && (
                      <button className="rounded-sm bg-room-ooo px-3 py-1.5 text-12 text-white">
                        Reconnect / re-authenticate
                      </button>
                    )}
                  </div>

                  <div>
                    <Eyebrow className="mb-2">Room type &amp; rate plan mapping</Eyebrow>
                    {MAPPING.map((m) => (
                      <div
                        key={m.local}
                        className="flex items-center gap-2.5 border-b border-line-soft py-1.5 text-[12.5px]"
                      >
                        <span className="flex-1">{m.local}</span>
                        <ArrowRight className="h-3 w-3 text-fg-3" />
                        <span className="flex-1 text-fg-2">{m.remote}</span>
                        <span className="text-[10.5px] text-fg-3">min stay {m.minStay}n</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ["Commission", c.commission],
                      ["Bookings this month", c.bookings],
                      ["Revenue this month", c.revenue],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div className="text-[11px] text-fg-3">{k}</div>
                        <div className="font-mono text-14 font-semibold">{v}</div>
                      </div>
                    ))}
                  </div>

                  {c.errorLog && (
                    <div>
                      <Eyebrow className="mb-2">Sync error log</Eyebrow>
                      <div className="flex items-center gap-2.5 py-1.5 text-[12.5px] text-res-tentative">
                        <AlertTriangle className="h-[13px] w-[13px] flex-none" />
                        <span className="flex-1">{c.errorLog}</span>
                        <button className="rounded-sm border border-line px-2.5 py-1 text-[11px] text-fg-1">
                          Resolve
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
