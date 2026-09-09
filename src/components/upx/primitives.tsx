import React from "react";

/** Section kicker — ALL-CAPS, wide tracking, tertiary text. */
export function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-[11px] font-medium uppercase tracking-[0.08em] text-fg-3 ${className}`}
    >
      {children}
    </div>
  );
}

/** Standard elevated card: border + bg-elevated + resting shadow. */
export function Card({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
}) {
  return (
    <Tag
      className={`rounded-lg border border-line bg-elevated shadow-1 ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** KPI tile — mono number, eyebrow label, delta line. */
export function StatTile({
  label,
  value,
  delta,
  deltaTone = "muted",
  valueTone = "default",
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "positive" | "muted";
  valueTone?: "default" | "cyan";
}) {
  return (
    <Card className="p-4">
      <Eyebrow>{label}</Eyebrow>
      <div
        className={`mt-1.5 font-mono text-[24px] font-semibold ${
          valueTone === "cyan" ? "text-accent-cyan" : "text-ice"
        }`}
      >
        {value}
      </div>
      {delta && (
        <div
          className={`mt-1 text-12 ${
            deltaTone === "positive" ? "text-accent-cyan" : "text-fg-3"
          }`}
        >
          {delta}
        </div>
      )}
    </Card>
  );
}

const PILL_TONES: Record<string, string> = {
  neutral: "border-line text-fg-2",
  violet: "border-accent-violet text-accent-violet-hi",
  cyan: "border-accent-cyan text-accent-cyan",
  amber: "border-room-vacant-dirty text-room-vacant-dirty",
  rose: "border-room-ooo text-room-ooo",
  muted: "border-line text-fg-3",
};

/** Status capsule. */
export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof PILL_TONES;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-pill border bg-fg-1/[0.06] px-2.5 py-0.5 text-[11px] ${PILL_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Small secondary button (ghost, hairline border). */
export function GhostButton({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-sm border border-line bg-fg-1/[0.06] px-3 py-2 text-[12.5px] text-fg-1 transition-colors duration-fast ease-out hover:border-line-strong ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Primary violet button. */
export function PrimaryButton({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-sm bg-accent-violet px-3 py-2 text-[12.5px] font-medium text-ice transition-colors duration-fast ease-out hover:bg-accent-violet-hi ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Pill-segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-pill border border-line bg-elevated p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-pill px-2.5 py-[5px] text-[11.5px] transition-colors duration-fast ${
            value === o.value
              ? "bg-accent-violet text-ice"
              : "text-fg-3 hover:text-fg-1"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const ROOM_STATUS_COLOR: Record<string, string> = {
  Inspected: "var(--room-inspected)",
  "Vacant Clean": "var(--room-vacant-clean)",
  Occupied: "var(--room-occupied)",
  "Vacant Dirty": "var(--room-vacant-dirty)",
  OOO: "var(--room-ooo)",
  OOS: "var(--room-oos)",
};

export const ROOM_STATUS_WASH: Record<string, string> = {
  Inspected: "var(--room-inspected-w)",
  "Vacant Clean": "var(--room-vacant-clean-w)",
  Occupied: "var(--room-occupied-w)",
  "Vacant Dirty": "var(--room-vacant-dirty-w)",
  OOO: "var(--room-ooo-w)",
  OOS: "var(--room-oos-w)",
};

export const RES_STATUS_COLOR: Record<string, string> = {
  inhouse: "var(--res-inhouse)",
  confirmed: "var(--res-confirmed)",
  tentative: "var(--res-tentative)",
  departed: "var(--res-departed)",
  cancelled: "var(--res-cancelled)",
  no_show: "var(--room-ooo)",
};

export const RES_STATUS_LABEL: Record<string, string> = {
  inhouse: "In-house",
  confirmed: "Confirmed",
  tentative: "Tentative",
  departed: "Checked out",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export const TIER_COLOR: Record<string, string> = {
  Platinum: "var(--accent-violet-hi)",
  Gold: "var(--warning)",
  Silver: "var(--fg-3)",
};

/** Guest initials from a full name. */
export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
