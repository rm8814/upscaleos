/* @ds-bundle: {"format":4,"namespace":"UPSCALEDesignSystem_019e2c","components":[{"name":"AppShell","sourcePath":"ui_kits/upscale-app/components/AppShell.jsx"},{"name":"CalendarTapeChart","sourcePath":"ui_kits/upscale-app/components/CalendarTapeChart.jsx"},{"name":"CommandPalette","sourcePath":"ui_kits/upscale-app/components/CommandPalette.jsx"},{"name":"HousekeepingBoard","sourcePath":"ui_kits/upscale-app/components/HousekeepingBoard.jsx"},{"name":"LoginScreen","sourcePath":"ui_kits/upscale-app/components/LoginScreen.jsx"},{"name":"Primitives","sourcePath":"ui_kits/upscale-app/components/Primitives.jsx"},{"name":"PropertyDashboard","sourcePath":"ui_kits/upscale-app/components/PropertyDashboard.jsx"},{"name":"ReservationSlideOver","sourcePath":"ui_kits/upscale-app/components/ReservationSlideOver.jsx"}],"sourceHashes":{"ui_kits/upscale-app/components/AppShell.jsx":"abaebfde5f68","ui_kits/upscale-app/components/CalendarTapeChart.jsx":"51e82a11c526","ui_kits/upscale-app/components/CommandPalette.jsx":"e5ff844d8262","ui_kits/upscale-app/components/HousekeepingBoard.jsx":"d65e62479aea","ui_kits/upscale-app/components/LoginScreen.jsx":"620c0350dbc3","ui_kits/upscale-app/components/Primitives.jsx":"3b745908c71b","ui_kits/upscale-app/components/PropertyDashboard.jsx":"f3aaff740662","ui_kits/upscale-app/components/ReservationSlideOver.jsx":"699baa58c7a4"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.UPSCALEDesignSystem_019e2c = window.UPSCALEDesignSystem_019e2c || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/upscale-app/components/AppShell.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React, Icon, Button, Pill, LiveDot */
const {
  useState
} = React;

// =============================================================================
// AppShell — top bar + collapsible left rail. Wraps every product screen.
// =============================================================================

function AppShell({
  activeRoute,
  onRoute,
  onSignOut,
  onOpenCommand,
  children
}) {
  const [railCollapsed, setRailCollapsed] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      background: "var(--bg-ink)",
      color: "var(--fg-1)",
      fontFamily: "var(--font-body)",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    onOpenCommand: onOpenCommand,
    onSignOut: onSignOut,
    onToggleRail: () => setRailCollapsed(c => !c)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flex: 1,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(LeftRail, {
    collapsed: railCollapsed,
    activeRoute: activeRoute,
    onRoute: onRoute
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      overflow: "auto"
    }
  }, children)));
}
function TopBar({
  onOpenCommand,
  onSignOut,
  onToggleRail
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 56,
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "0 20px",
      background: "rgba(8,20,40,.72)",
      backdropFilter: "blur(20px) saturate(140%)",
      WebkitBackdropFilter: "blur(20px) saturate(140%)",
      borderBottom: "1px solid var(--line)",
      position: "sticky",
      top: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onToggleRail,
    style: {
      background: "transparent",
      border: "none",
      color: "var(--fg-2)",
      cursor: "pointer",
      padding: 6,
      display: "inline-flex"
    },
    "aria-label": "Toggle navigation"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "panel-left",
    size: 20
  })), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__resources && window.__resources.logoMark || "../../assets/logo-mark.svg",
    width: "28",
    height: "28",
    alt: "",
    style: {
      borderRadius: 6
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-brand)",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      fontSize: 18,
      color: "var(--fg-1)",
      lineHeight: 1
    }
  }, "upscale", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent-violet-hi)"
    }
  }, "."))), /*#__PURE__*/React.createElement(Pill, {
    tone: "positive",
    live: true,
    style: {
      marginLeft: 8
    }
  }, "Channels \xB7 synced"), /*#__PURE__*/React.createElement("button", {
    onClick: onOpenCommand,
    style: {
      flex: 1,
      maxWidth: 520,
      margin: "0 12px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      background: "var(--bg-deep)",
      border: "1px solid var(--line)",
      borderRadius: 8,
      padding: "7px 12px",
      color: "var(--fg-3)",
      cursor: "pointer",
      fontFamily: "var(--font-body)",
      fontSize: 13,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, "Search reservations, guests, rooms\u2026"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      display: "inline-flex",
      gap: 3,
      fontFamily: "var(--font-mono)",
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement(Kbd, null, "\u2318"), /*#__PURE__*/React.createElement(Kbd, null, "K"))), /*#__PURE__*/React.createElement(TopBarButton, {
    icon: "bell",
    badge: 3
  }), /*#__PURE__*/React.createElement(TopBarButton, {
    icon: "settings"
  }), /*#__PURE__*/React.createElement(AvatarMenu, {
    onSignOut: onSignOut
  }));
}
function Kbd({
  children
}) {
  return /*#__PURE__*/React.createElement("kbd", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      background: "rgba(238,244,255,.08)",
      border: "1px solid var(--line)",
      borderRadius: 4,
      padding: "1px 5px",
      color: "var(--fg-2)"
    }
  }, children);
}
function TopBarButton({
  icon,
  badge
}) {
  return /*#__PURE__*/React.createElement("button", {
    style: {
      position: "relative",
      background: "transparent",
      border: "none",
      color: "var(--fg-2)",
      cursor: "pointer",
      padding: 8,
      borderRadius: 8,
      display: "inline-flex"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 18
  }), badge ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 4,
      right: 4,
      minWidth: 14,
      height: 14,
      padding: "0 4px",
      borderRadius: 7,
      background: "var(--accent-violet)",
      color: "var(--fg-on-accent)",
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      fontWeight: 600,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border: "2px solid var(--bg-ink)"
    }
  }, badge) : null);
}
function AvatarMenu({
  onSignOut
}) {
  const [open, setOpen] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    style: {
      width: 32,
      height: 32,
      borderRadius: 999,
      background: "linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))",
      border: "1px solid var(--line-strong)",
      color: "var(--fg-on-accent)",
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer"
    }
  }, "AR"), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 40,
      right: 0,
      minWidth: 220,
      background: "var(--bg-elevated)",
      border: "1px solid var(--line)",
      borderRadius: 10,
      boxShadow: "0 24px 60px -16px rgba(3,6,15,.9)",
      padding: 6,
      zIndex: 50
    }
  }, /*#__PURE__*/React.createElement(MenuRow, {
    icon: "user-circle"
  }, "Arif Rachman"), /*#__PURE__*/React.createElement(MenuRow, {
    icon: "building"
  }, "Switch account"), /*#__PURE__*/React.createElement(MenuRow, {
    icon: "settings"
  }, "Account settings"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--line)",
      margin: "6px 0"
    }
  }), /*#__PURE__*/React.createElement(MenuRow, {
    icon: "log-out",
    onClick: onSignOut
  }, "Sign out")));
}
function MenuRow({
  icon,
  children,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      width: "100%",
      textAlign: "left",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 10px",
      borderRadius: 6,
      background: "transparent",
      border: "none",
      color: "var(--fg-1)",
      fontFamily: "var(--font-body)",
      fontSize: 13,
      cursor: "pointer"
    },
    onMouseEnter: e => e.currentTarget.style.background = "rgba(238,244,255,.06)",
    onMouseLeave: e => e.currentTarget.style.background = "transparent"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 15,
    style: {
      color: "var(--fg-3)"
    }
  }), children);
}
function LeftRail({
  collapsed,
  activeRoute,
  onRoute
}) {
  const items = [{
    key: "dashboard",
    label: "Dashboard",
    icon: "layout-dashboard"
  }, {
    key: "calendar",
    label: "Calendar",
    icon: "calendar-days",
    badge: "14d"
  }, {
    key: "reservations",
    label: "Reservations",
    icon: "clipboard-list",
    badge: "28"
  }, {
    key: "housekeeping",
    label: "Housekeeping",
    icon: "sparkles"
  }, {
    key: "rates",
    label: "Rates",
    icon: "percent"
  }];
  const tools = [{
    key: "guests",
    label: "Guests",
    icon: "users"
  }, {
    key: "channels",
    label: "Channels",
    icon: "globe"
  }, {
    key: "reports",
    label: "Reports",
    icon: "bar-chart-3"
  }];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: collapsed ? 64 : 240,
      background: "var(--bg-deep)",
      borderRight: "1px solid var(--line)",
      padding: "16px 10px",
      transition: "width 220ms cubic-bezier(.2,.8,.2,1)",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(RailGroup, {
    label: collapsed ? null : "Workspace"
  }, items.map(it => /*#__PURE__*/React.createElement(RailItem, _extends({
    key: it.key
  }, it, {
    collapsed: collapsed,
    active: activeRoute === it.key,
    onClick: () => onRoute(it.key)
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 16
    }
  }), /*#__PURE__*/React.createElement(RailGroup, {
    label: collapsed ? null : "Tools"
  }, tools.map(it => /*#__PURE__*/React.createElement(RailItem, _extends({
    key: it.key
  }, it, {
    collapsed: collapsed,
    onClick: () => {}
  })))), !collapsed && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      padding: 14,
      borderRadius: 14,
      background: "linear-gradient(135deg, rgba(124,92,252,.18), rgba(0,212,255,.10))",
      border: "1px solid rgba(124,92,252,.4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-brand)",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      fontSize: 15,
      color: "var(--fg-1)",
      marginBottom: 4,
      lineHeight: 1
    }
  }, "upscale", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent-violet-hi)"
    }
  }, "."), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 13,
      fontWeight: 600,
      color: "var(--fg-2)"
    }
  }, "AI")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "var(--fg-2)",
      marginBottom: 10,
      lineHeight: 1.5
    }
  }, "Rate suggestions, demand forecasts, copilot."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "Try copilot")));
}
function RailGroup({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement("div", null, label && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--fg-3)",
      padding: "4px 10px",
      marginBottom: 4
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, children));
}
function RailItem({
  icon,
  label,
  badge,
  collapsed,
  active,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: collapsed ? "10px 0" : "9px 10px",
      justifyContent: collapsed ? "center" : "flex-start",
      borderRadius: 8,
      background: active ? "rgba(124,92,252,.16)" : "transparent",
      border: "none",
      color: active ? "var(--fg-1)" : "var(--fg-2)",
      fontFamily: "var(--font-body)",
      fontSize: 13,
      fontWeight: active ? 500 : 400,
      cursor: "pointer",
      textAlign: "left",
      position: "relative"
    },
    onMouseEnter: e => {
      if (!active) e.currentTarget.style.background = "rgba(238,244,255,.04)";
    },
    onMouseLeave: e => {
      if (!active) e.currentTarget.style.background = "transparent";
    }
  }, active && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 0,
      top: 8,
      bottom: 8,
      width: 2,
      background: "var(--accent-violet)",
      borderRadius: 2
    }
  }), /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 16,
    style: {
      color: active ? "var(--accent-violet-hi)" : "var(--fg-3)",
      flexShrink: 0
    }
  }), !collapsed && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, label), badge && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, badge)));
}
Object.assign(window, {
  AppShell
});
Object.assign(__ds_scope, { AppShell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/upscale-app/components/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/upscale-app/components/CalendarTapeChart.jsx
try { (() => {
/* global React, Card, Eyebrow, Num, Pill, SegmentedControl, Button, Icon */
const {
  useState,
  useMemo
} = React;

// =============================================================================
// CalendarTapeChart — rooms × dates grid; reservations span multiple columns.
// The signature view of any PMS.
// =============================================================================

const ROOMS = [{
  num: "101",
  type: "Superior Q",
  floor: 1
}, {
  num: "102",
  type: "Superior Q",
  floor: 1
}, {
  num: "103",
  type: "Superior K",
  floor: 1
}, {
  num: "104",
  type: "Superior K",
  floor: 1
}, {
  num: "201",
  type: "Deluxe Twin",
  floor: 2
}, {
  num: "202",
  type: "Deluxe Twin",
  floor: 2
}, {
  num: "203",
  type: "Deluxe King",
  floor: 2
}, {
  num: "204",
  type: "Deluxe King",
  floor: 2
}, {
  num: "301",
  type: "Premier",
  floor: 3
}, {
  num: "302",
  type: "Premier",
  floor: 3
}, {
  num: "303",
  type: "Premier",
  floor: 3
}, {
  num: "401",
  type: "King Suite",
  floor: 4
}, {
  num: "402",
  type: "King Suite",
  floor: 4
}, {
  num: "501",
  type: "Suite Ocean",
  floor: 5
}];

// Reservations: { room, start (col 0-indexed), span, guest, status }
const RESERVATIONS = [{
  id: "rs1",
  room: "101",
  start: 0,
  span: 3,
  guest: "A. Pratama",
  status: "inhouse",
  channel: "Direct"
}, {
  id: "rs2",
  room: "101",
  start: 4,
  span: 2,
  guest: "L. Hartono",
  status: "confirmed",
  channel: "Booking"
}, {
  id: "rs3",
  room: "102",
  start: 1,
  span: 4,
  guest: "M. Sutanto",
  status: "inhouse",
  channel: "Agoda"
}, {
  id: "rs4",
  room: "102",
  start: 8,
  span: 3,
  guest: "D. Kusuma",
  status: "tentative",
  channel: "Direct"
}, {
  id: "rs5",
  room: "103",
  start: 0,
  span: 5,
  guest: "J. Lindberg",
  status: "inhouse",
  channel: "Booking"
}, {
  id: "rs6",
  room: "103",
  start: 6,
  span: 3,
  guest: "R. Salim",
  status: "confirmed",
  channel: "Traveloka"
}, {
  id: "rs7",
  room: "104",
  start: 2,
  span: 2,
  guest: "Y. Sato",
  status: "inhouse",
  channel: "Direct"
}, {
  id: "rs8",
  room: "104",
  start: 7,
  span: 4,
  guest: "N. Wijaya",
  status: "confirmed",
  channel: "Booking"
}, {
  id: "rs9",
  room: "201",
  start: 0,
  span: 3,
  guest: "A. Rachman",
  status: "inhouse",
  channel: "Booking"
}, {
  id: "rs10",
  room: "201",
  start: 5,
  span: 2,
  guest: "S. Wijaya",
  status: "confirmed",
  channel: "Direct",
  vip: true
}, {
  id: "rs11",
  room: "202",
  start: 1,
  span: 6,
  guest: "P. Maharani",
  status: "inhouse",
  channel: "Direct"
}, {
  id: "rs12",
  room: "203",
  start: 0,
  span: 2,
  guest: "T. Halim",
  status: "inhouse",
  channel: "Agoda"
}, {
  id: "rs13",
  room: "203",
  start: 3,
  span: 4,
  guest: "I. Setiawan",
  status: "confirmed",
  channel: "Booking"
}, {
  id: "rs14",
  room: "203",
  start: 9,
  span: 3,
  guest: "B. Kurniawan",
  status: "tentative",
  channel: "Direct"
}, {
  id: "rs15",
  room: "204",
  start: 1,
  span: 7,
  guest: "K. Tanaka",
  status: "inhouse",
  channel: "Direct",
  vip: true
}, {
  id: "rs16",
  room: "301",
  start: 2,
  span: 5,
  guest: "F. Hidayat",
  status: "inhouse",
  channel: "Booking"
}, {
  id: "rs17",
  room: "302",
  start: 0,
  span: 4,
  guest: "M. Putra",
  status: "inhouse",
  channel: "Direct"
}, {
  id: "rs18",
  room: "302",
  start: 5,
  span: 3,
  guest: "H. Lim",
  status: "confirmed",
  channel: "Agoda"
}, {
  id: "rs19",
  room: "303",
  start: 1,
  span: 8,
  guest: "Group · Acme",
  status: "confirmed",
  channel: "Direct"
}, {
  id: "rs20",
  room: "401",
  start: 0,
  span: 4,
  guest: "G. Wibowo",
  status: "inhouse",
  channel: "Direct",
  vip: true
}, {
  id: "rs21",
  room: "401",
  start: 6,
  span: 5,
  guest: "VIP · DPRD",
  status: "tentative",
  channel: "Direct",
  vip: true
}, {
  id: "rs22",
  room: "402",
  start: 3,
  span: 6,
  guest: "C. Sutanto",
  status: "confirmed",
  channel: "Booking"
}, {
  id: "rs23",
  room: "501",
  start: 0,
  span: 7,
  guest: "Hadi Family",
  status: "inhouse",
  channel: "Direct",
  vip: true
}];
const STATUS_STYLES = {
  tentative: {
    bg: "rgba(255,178,63,.18)",
    border: "var(--res-tentative)",
    fg: "var(--res-tentative)"
  },
  confirmed: {
    bg: "rgba(124,92,252,.22)",
    border: "var(--res-confirmed)",
    fg: "var(--accent-violet-hi)"
  },
  inhouse: {
    bg: "rgba(0,212,255,.18)",
    border: "var(--res-inhouse)",
    fg: "var(--res-inhouse)"
  },
  departed: {
    bg: "rgba(238,244,255,.04)",
    border: "var(--res-departed)",
    fg: "var(--fg-3)"
  },
  cancelled: {
    bg: "rgba(255,90,122,.16)",
    border: "var(--res-cancelled)",
    fg: "var(--res-cancelled)"
  }
};
function CalendarTapeChart({
  onOpenReservation
}) {
  const [filter, setFilter] = useState("all");
  const DAYS = 14;
  const CELL_W = 88;
  const ROW_H = 44;
  const ROOM_COL_W = 132;
  const dates = useMemo(() => {
    const start = new Date(2026, 4, 12); // Tue 12 May 2026
    return Array.from({
      length: DAYS
    }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);
  const visibleRooms = filter === "all" ? ROOMS : ROOMS.filter(r => r.floor === parseInt(filter));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 28px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 32,
      letterSpacing: "-0.02em",
      color: "var(--fg-1)",
      margin: 0
    }
  }, "Calendar"), /*#__PURE__*/React.createElement(Pill, null, "14-day \xB7 ", ROOMS.length, " rooms"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(SegmentedControl, {
    value: filter,
    onChange: setFilter,
    options: [{
      value: "all",
      label: "All floors"
    }, {
      value: "1",
      label: "1F"
    }, {
      value: "2",
      label: "2F"
    }, {
      value: "3",
      label: "3F"
    }, {
      value: "4",
      label: "4F"
    }, {
      value: "5",
      label: "5F"
    }]
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    icon: "plus",
    onClick: () => onOpenReservation({
      id: "new",
      guest: "New reservation"
    })
  }, "New reservation")), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 18px",
      borderBottom: "1px solid var(--line)",
      display: "flex",
      gap: 16,
      alignItems: "center",
      fontFamily: "var(--font-body)",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement(Legend, {
    color: "var(--res-inhouse)",
    label: "In-house"
  }), /*#__PURE__*/React.createElement(Legend, {
    color: "var(--res-confirmed)",
    label: "Confirmed"
  }), /*#__PURE__*/React.createElement(Legend, {
    color: "var(--res-tentative)",
    label: "Tentative"
  }), /*#__PURE__*/React.createElement(Legend, {
    color: "var(--res-cancelled)",
    label: "Cancelled"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-3)"
    }
  }, "Drag blocks to move \xB7 click to open")), /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: "auto",
      maxHeight: "calc(100vh - 280px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-grid",
      gridTemplateColumns: `${ROOM_COL_W}px repeat(${DAYS}, ${CELL_W}px)`,
      minWidth: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: 1,
      gridRow: 1,
      position: "sticky",
      left: 0,
      top: 0,
      zIndex: 4,
      background: "var(--bg-elevated)",
      borderBottom: "1px solid var(--line)",
      borderRight: "1px solid var(--line)",
      padding: "10px 14px",
      fontFamily: "var(--font-body)",
      fontSize: 11,
      color: "var(--fg-3)",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      fontWeight: 500
    }
  }, "Room"), dates.map((d, i) => {
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isToday = i === 0;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        gridColumn: i + 2,
        gridRow: 1,
        position: "sticky",
        top: 0,
        zIndex: 3,
        background: isToday ? "rgba(124,92,252,.10)" : "var(--bg-elevated)",
        borderBottom: "1px solid var(--line)",
        borderRight: "1px solid var(--line-soft)",
        padding: "8px 10px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-body)",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        fontWeight: 500,
        color: isWeekend ? "var(--accent-violet-hi)" : "var(--fg-3)"
      }
    }, d.toLocaleDateString("en-US", {
      weekday: "short"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        fontWeight: 600,
        color: isToday ? "var(--fg-1)" : "var(--fg-1)",
        marginTop: 2
      }
    }, d.getDate(), isToday && /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-block",
        marginLeft: 4,
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: "var(--accent-violet)",
        verticalAlign: "middle"
      }
    })));
  }), visibleRooms.map((room, ri) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: room.num
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: 1,
      gridRow: ri + 2,
      position: "sticky",
      left: 0,
      zIndex: 2,
      background: "var(--bg-elevated)",
      borderRight: "1px solid var(--line)",
      borderBottom: "1px solid var(--line-soft)",
      padding: "0 14px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      height: ROW_H
    }
  }, /*#__PURE__*/React.createElement(Num, {
    size: 14,
    weight: 600
  }, room.num), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, room.type)), dates.map((d, di) => /*#__PURE__*/React.createElement("div", {
    key: di,
    style: {
      gridColumn: di + 2,
      gridRow: ri + 2,
      height: ROW_H,
      borderRight: "1px solid var(--line-soft)",
      borderBottom: "1px solid var(--line-soft)",
      background: di === 0 ? "rgba(124,92,252,.05)" : "transparent"
    }
  })), RESERVATIONS.filter(r => r.room === room.num).map(res => {
    const s = STATUS_STYLES[res.status] || STATUS_STYLES.confirmed;
    return /*#__PURE__*/React.createElement("button", {
      key: res.id,
      onClick: () => onOpenReservation(res),
      style: {
        gridColumn: `${res.start + 2} / span ${res.span}`,
        gridRow: ri + 2,
        alignSelf: "center",
        margin: "0 3px",
        height: ROW_H - 12,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderLeft: `3px solid ${s.border}`,
        borderRadius: 6,
        padding: "3px 8px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-body)",
        fontSize: 12,
        color: s.fg,
        fontWeight: 500,
        cursor: "pointer",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        textAlign: "left",
        zIndex: 1
      },
      onMouseEnter: e => {
        e.currentTarget.style.filter = "brightness(1.2)";
      },
      onMouseLeave: e => {
        e.currentTarget.style.filter = "none";
      }
    }, res.vip && /*#__PURE__*/React.createElement(Icon, {
      name: "star",
      size: 10,
      style: {
        color: s.fg,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        color: "var(--fg-1)"
      }
    }, res.guest), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto",
        opacity: 0.6,
        fontSize: 10,
        fontFamily: "var(--font-mono)"
      }
    }, res.span, "n"));
  })))))));
}
function Legend({
  color,
  label
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      color: "var(--fg-2)",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 12,
      height: 10,
      borderRadius: 3,
      background: color,
      opacity: 0.35,
      borderLeft: `3px solid ${color}`,
      opacity: 0.7
    }
  }), label);
}
Object.assign(window, {
  CalendarTapeChart,
  ROOMS,
  RESERVATIONS
});
Object.assign(__ds_scope, { CalendarTapeChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/upscale-app/components/CalendarTapeChart.jsx", error: String((e && e.message) || e) }); }

// ui_kits/upscale-app/components/CommandPalette.jsx
try { (() => {
/* global React, Icon */
const {
  useState,
  useEffect,
  useMemo,
  useRef
} = React;

// =============================================================================
// CommandPalette — ⌘K modal overlay.
// =============================================================================

const COMMANDS = [{
  group: "Reservations",
  icon: "clipboard-list",
  label: "New reservation",
  shortcut: "N R"
}, {
  group: "Reservations",
  icon: "log-in",
  label: "Check in guest",
  shortcut: "⇧ I"
}, {
  group: "Reservations",
  icon: "log-out",
  label: "Check out guest",
  shortcut: "⇧ O"
}, {
  group: "Reservations",
  icon: "calendar-x",
  label: "Cancel reservation"
}, {
  group: "Rooms",
  icon: "sparkles",
  label: "Mark room clean",
  shortcut: "⇧ C"
}, {
  group: "Rooms",
  icon: "shield-check",
  label: "Mark room inspected"
}, {
  group: "Rooms",
  icon: "wrench",
  label: "Send room to maintenance"
}, {
  group: "Rooms",
  icon: "door-open",
  label: "Open room map"
}, {
  group: "Navigate",
  icon: "layout-dashboard",
  label: "Go to Dashboard",
  shortcut: "G D"
}, {
  group: "Navigate",
  icon: "calendar-days",
  label: "Go to Calendar",
  shortcut: "G C"
}, {
  group: "Navigate",
  icon: "clipboard-list",
  label: "Go to Reservations",
  shortcut: "G R"
}, {
  group: "Navigate",
  icon: "sparkles",
  label: "Go to Housekeeping",
  shortcut: "G H"
}, {
  group: "Navigate",
  icon: "percent",
  label: "Go to Rates",
  shortcut: "G P"
}, {
  group: "Rates & channels",
  icon: "trending-up",
  label: "Apply AI rate suggestion"
}, {
  group: "Rates & channels",
  icon: "globe",
  label: "Sync channels now"
}, {
  group: "Reports",
  icon: "bar-chart-3",
  label: "Daily flash report"
}, {
  group: "Reports",
  icon: "file-text",
  label: "Export folio · PDF"
}, {
  group: "Settings",
  icon: "user-circle",
  label: "Account settings"
}, {
  group: "Settings",
  icon: "shield-check",
  label: "Two-factor authentication"
}];
function CommandPalette({
  open,
  onClose,
  onCommand
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);
  const filtered = useMemo(() => COMMANDS.filter(c => c.label.toLowerCase().includes(q.toLowerCase())), [q]);
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach((c, i) => {
      (g[c.group] ||= []).push({
        ...c,
        _i: i
      });
    });
    return g;
  }, [filtered]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 110,
      background: "rgba(3,6,15,.72)",
      backdropFilter: "blur(6px)",
      display: "flex",
      justifyContent: "center",
      paddingTop: "12vh"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: 600,
      maxWidth: "92vw",
      maxHeight: "70vh",
      background: "var(--bg-elevated)",
      border: "1px solid var(--line-strong)",
      borderRadius: 14,
      boxShadow: "0 24px 60px -16px rgba(3,6,15,.9), 0 0 0 1px rgba(124,92,252,.2)",
      display: "flex",
      flexDirection: "column",
      animation: "upx-cmd-in 200ms cubic-bezier(.2,.8,.2,1)"
    }
  }, /*#__PURE__*/React.createElement("style", null, `@keyframes upx-cmd-in { from { opacity:0; transform: translateY(-8px) scale(.985); } to { opacity:1; transform: none; } }`), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: 14,
      borderBottom: "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 18,
    style: {
      color: "var(--fg-3)"
    }
  }), /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    value: q,
    onChange: e => {
      setQ(e.target.value);
      setActive(0);
    },
    onKeyDown: e => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") setActive(a => Math.min(a + 1, filtered.length - 1));
      if (e.key === "ArrowUp") setActive(a => Math.max(a - 1, 0));
      if (e.key === "Enter") {
        onCommand?.(filtered[active]);
        onClose();
      }
    },
    placeholder: "Type a command, ticker, or \u23CE a question\u2026",
    style: {
      flex: 1,
      background: "transparent",
      border: "none",
      outline: "none",
      fontFamily: "var(--font-body)",
      fontSize: 16,
      color: "var(--fg-1)"
    }
  }), /*#__PURE__*/React.createElement("kbd", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      background: "rgba(238,244,255,.08)",
      border: "1px solid var(--line)",
      borderRadius: 4,
      padding: "2px 6px",
      color: "var(--fg-2)"
    }
  }, "esc")), /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: "auto",
      padding: 8
    }
  }, Object.entries(grouped).map(([group, items]) => /*#__PURE__*/React.createElement("div", {
    key: group,
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--fg-3)",
      padding: "8px 10px"
    }
  }, group), items.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.label,
    onMouseEnter: () => setActive(c._i),
    onClick: () => {
      onCommand?.(c);
      onClose();
    },
    style: {
      width: "100%",
      textAlign: "left",
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "9px 10px",
      borderRadius: 8,
      background: c._i === active ? "rgba(124,92,252,.16)" : "transparent",
      border: "none",
      cursor: "pointer",
      color: "var(--fg-1)",
      fontFamily: "var(--font-body)",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: c.icon,
    size: 15,
    style: {
      color: c._i === active ? "var(--accent-violet-hi)" : "var(--fg-3)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, c.label), c.shortcut && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, c.shortcut))))), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      textAlign: "center",
      color: "var(--fg-3)",
      fontFamily: "var(--font-body)",
      fontSize: 13
    }
  }, "No matches.")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      borderTop: "1px solid var(--line)",
      display: "flex",
      gap: 12,
      alignItems: "center",
      fontFamily: "var(--font-body)",
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, /*#__PURE__*/React.createElement(KbdHint, {
    k: "\u2191\u2193"
  }, "navigate"), /*#__PURE__*/React.createElement(KbdHint, {
    k: "\u23CE"
  }, "select"), /*#__PURE__*/React.createElement(KbdHint, {
    k: "esc"
  }, "close"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "zap",
    size: 12
  }), "Powered by ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-brand)",
      fontWeight: 700,
      color: "var(--fg-2)"
    }
  }, "upscale", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent-violet-hi)"
    }
  }, "."))))));
}
function KbdHint({
  k,
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("kbd", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      background: "rgba(238,244,255,.08)",
      border: "1px solid var(--line)",
      borderRadius: 4,
      padding: "1px 5px",
      color: "var(--fg-2)"
    }
  }, k), children);
}
Object.assign(window, {
  CommandPalette
});
Object.assign(__ds_scope, { CommandPalette });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/upscale-app/components/CommandPalette.jsx", error: String((e && e.message) || e) }); }

// ui_kits/upscale-app/components/HousekeepingBoard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React, Card, Eyebrow, Num, Pill, Button, Icon, SegmentedControl */
const {
  useState
} = React;

// =============================================================================
// HousekeepingBoard — grid of room cards, colored by status.
// =============================================================================

const HK_ROOMS = [{
  num: "101",
  floor: 1,
  type: "Superior Q",
  status: "vacant-clean"
}, {
  num: "102",
  floor: 1,
  type: "Superior Q",
  status: "vacant-dirty",
  task: "Checkout 11:00",
  priority: "high"
}, {
  num: "103",
  floor: 1,
  type: "Superior K",
  status: "occupied",
  guest: "M. Sutanto"
}, {
  num: "104",
  floor: 1,
  type: "Superior K",
  status: "inspected"
}, {
  num: "201",
  floor: 2,
  type: "Deluxe Twin",
  status: "occupied",
  guest: "A. Rachman"
}, {
  num: "202",
  floor: 2,
  type: "Deluxe Twin",
  status: "vacant-dirty",
  task: "Stayover"
}, {
  num: "203",
  floor: 2,
  type: "Deluxe King",
  status: "vacant-clean"
}, {
  num: "204",
  floor: 2,
  type: "Deluxe King",
  status: "occupied",
  guest: "K. Tanaka",
  vip: true
}, {
  num: "205",
  floor: 2,
  type: "Deluxe King",
  status: "ooo",
  task: "AC repair · maint."
}, {
  num: "301",
  floor: 3,
  type: "Premier",
  status: "occupied",
  guest: "F. Hidayat"
}, {
  num: "302",
  floor: 3,
  type: "Premier",
  status: "vacant-dirty",
  task: "Checkout 10:30"
}, {
  num: "303",
  floor: 3,
  type: "Premier",
  status: "occupied",
  guest: "Group · Acme"
}, {
  num: "401",
  floor: 4,
  type: "King Suite",
  status: "vacant-clean"
}, {
  num: "402",
  floor: 4,
  type: "King Suite",
  status: "inspected"
}, {
  num: "403",
  floor: 4,
  type: "King Suite",
  status: "oos",
  task: "Deep clean"
}, {
  num: "501",
  floor: 5,
  type: "Suite Ocean",
  status: "occupied",
  guest: "Hadi Family",
  vip: true
}, {
  num: "502",
  floor: 5,
  type: "Suite Ocean",
  status: "vacant-dirty",
  task: "Late checkout 14:00",
  priority: "high"
}, {
  num: "503",
  floor: 5,
  type: "Suite Ocean",
  status: "vacant-clean"
}];
const HK_STATUS = {
  "vacant-clean": {
    label: "Vacant clean",
    color: "var(--room-vacant-clean)",
    bg: "var(--room-vacant-clean-w)",
    border: "rgba(0,212,255,.3)"
  },
  "inspected": {
    label: "Inspected",
    color: "var(--room-inspected)",
    bg: "var(--room-inspected-w)",
    border: "rgba(155,128,255,.3)"
  },
  "vacant-dirty": {
    label: "Vacant dirty",
    color: "var(--room-vacant-dirty)",
    bg: "var(--room-vacant-dirty-w)",
    border: "rgba(255,178,63,.3)"
  },
  "occupied": {
    label: "Occupied",
    color: "var(--room-occupied)",
    bg: "var(--room-occupied-w)",
    border: "rgba(124,92,252,.4)"
  },
  "ooo": {
    label: "Out of order",
    color: "var(--room-ooo)",
    bg: "var(--room-ooo-w)",
    border: "rgba(255,90,122,.3)"
  },
  "oos": {
    label: "Out of service",
    color: "var(--room-oos)",
    bg: "var(--room-oos-w)",
    border: "rgba(238,244,255,.16)"
  }
};
function HousekeepingBoard() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? HK_ROOMS : HK_ROOMS.filter(r => r.status === filter);

  // counts for the filter chips
  const counts = HK_ROOMS.reduce((a, r) => ({
    ...a,
    [r.status]: (a[r.status] || 0) + 1
  }), {});
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 28px",
      maxWidth: 1280
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 32,
      letterSpacing: "-0.02em",
      color: "var(--fg-1)",
      margin: 0
    }
  }, "Housekeeping"), /*#__PURE__*/React.createElement(Pill, null, HK_ROOMS.length, " rooms"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "var(--fg-3)",
      marginLeft: 8
    }
  }, "Updated 14:32"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    icon: "refresh-cw"
  }, "Sync")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      margin: "18px 0"
    }
  }, /*#__PURE__*/React.createElement(FilterChip, {
    active: filter === "all",
    onClick: () => setFilter("all"),
    label: "All",
    count: HK_ROOMS.length
  }), Object.entries(HK_STATUS).map(([key, s]) => /*#__PURE__*/React.createElement(FilterChip, {
    key: key,
    active: filter === key,
    onClick: () => setFilter(key),
    label: s.label,
    count: counts[key] || 0,
    color: s.color
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
      gap: 10
    }
  }, filtered.map(room => /*#__PURE__*/React.createElement(RoomTile, _extends({
    key: room.num
  }, room)))));
}
function FilterChip({
  active,
  onClick,
  label,
  count,
  color
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 12px",
      borderRadius: 999,
      background: active ? "rgba(124,92,252,.18)" : "transparent",
      border: `1px solid ${active ? "var(--accent-violet)" : "var(--line)"}`,
      color: active ? "var(--accent-violet-hi)" : "var(--fg-2)",
      fontFamily: "var(--font-body)",
      fontSize: 12,
      fontWeight: 500,
      cursor: "pointer"
    }
  }, color && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: color
    }
  }), label, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, count));
}
function RoomTile({
  num,
  type,
  status,
  guest,
  task,
  vip,
  priority
}) {
  const [hover, setHover] = useState(false);
  const s = HK_STATUS[status];
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: "relative",
      borderRadius: 10,
      padding: "12px 12px 14px",
      minHeight: 110,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      border: `1px solid ${s.border}`,
      background: s.bg,
      cursor: "pointer",
      transition: "all 140ms cubic-bezier(.2,.8,.2,1)",
      filter: hover ? "brightness(1.1)" : "none"
    }
  }, priority === "high" && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 8,
      right: 8,
      padding: "1px 6px",
      borderRadius: 4,
      background: "rgba(255,90,122,.18)",
      border: "1px solid var(--negative)",
      fontFamily: "var(--font-body)",
      fontSize: 9,
      fontWeight: 600,
      color: "var(--negative)",
      letterSpacing: "0.14em",
      textTransform: "uppercase"
    }
  }, "Rush"), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 10,
      right: priority === "high" ? 64 : 10,
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: s.color
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Num, {
    size: 20,
    weight: 600
  }, num), vip && /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    size: 12,
    style: {
      color: "var(--accent-violet-hi)"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: s.color
    }
  }, s.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 11,
      color: "var(--fg-3)",
      marginTop: 2
    }
  }, guest || task || type)));
}
Object.assign(window, {
  HousekeepingBoard,
  HK_ROOMS
});
Object.assign(__ds_scope, { HousekeepingBoard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/upscale-app/components/HousekeepingBoard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/upscale-app/components/LoginScreen.jsx
try { (() => {
/* global React, Button, Field, Pill */
const {
  useState
} = React;

// =============================================================================
// LoginScreen — email + OTP, dark on dark.
// =============================================================================

function LoginScreen({
  onContinue
}) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("gm@aloft-seminyak.id");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      background: "var(--bg-ink)",
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "-20%",
      left: "50%",
      transform: "translateX(-50%)",
      width: 800,
      height: 800,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(124,92,252,.28), rgba(0,212,255,.06) 40%, transparent 60%)",
      filter: "blur(20px)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 1,
      width: 420,
      maxWidth: "100%",
      background: "var(--bg-elevated)",
      border: "1px solid var(--line)",
      borderRadius: 20,
      padding: 32,
      boxShadow: "0 24px 60px -16px rgba(3,6,15,.9)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__resources && window.__resources.logoMark || "../../assets/logo-mark.svg",
    width: "40",
    height: "40",
    alt: "",
    style: {
      borderRadius: 8
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-brand)",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      fontSize: 22,
      color: "var(--fg-1)",
      lineHeight: 1
    }
  }, "upscale", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent-violet-hi)"
    }
  }, ".")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, "by PT Arthavara Skala Kriya"))), step === "email" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 26,
      letterSpacing: "-0.02em",
      color: "var(--fg-1)",
      margin: "0 0 6px"
    }
  }, "Welcome back."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 14,
      color: "var(--fg-2)",
      margin: "0 0 22px",
      lineHeight: 1.5
    }
  }, "Sign in with your property email. A 6-digit code will be sent to your device."), /*#__PURE__*/React.createElement(Field, {
    label: "Email",
    value: email,
    onChange: e => setEmail(e.target.value),
    style: {
      marginBottom: 16
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: () => setStep("otp"),
    style: {
      width: "100%",
      justifyContent: "center"
    },
    iconRight: "arrow-right"
  }, "Continue"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      margin: "20px 0 6px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 1,
      background: "var(--line)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 11,
      color: "var(--fg-3)",
      letterSpacing: "0.14em",
      textTransform: "uppercase"
    }
  }, "or"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 1,
      background: "var(--line)"
    }
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "md",
    style: {
      width: "100%",
      justifyContent: "center",
      marginTop: 14
    },
    icon: "fingerprint"
  }, "Sign in with biometrics"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22,
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "var(--fg-3)",
      textAlign: "center",
      display: "flex",
      gap: 6,
      justifyContent: "center",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: "positive",
    live: true
  }, "secure"), "SOC 2 \xB7 Indonesia data residency")), step === "otp" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 26,
      letterSpacing: "-0.02em",
      color: "var(--fg-1)",
      margin: "0 0 6px"
    }
  }, "Enter your code."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 14,
      color: "var(--fg-2)",
      margin: "0 0 22px",
      lineHeight: 1.5
    }
  }, "We sent a 6-digit code to ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--fg-1)"
    }
  }, email), ". Enter it below."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "space-between",
      marginBottom: 18
    }
  }, otp.map((d, i) => /*#__PURE__*/React.createElement("input", {
    key: i,
    value: d,
    maxLength: 1,
    onChange: e => {
      const v = e.target.value.replace(/[^\d]/g, "");
      setOtp(arr => {
        const next = [...arr];
        next[i] = v;
        return next;
      });
      if (v && e.target.nextElementSibling) e.target.nextElementSibling.focus();
    },
    style: {
      width: 48,
      height: 56,
      textAlign: "center",
      fontFamily: "var(--font-mono)",
      fontSize: 20,
      fontWeight: 600,
      color: "var(--fg-1)",
      background: "var(--bg-deep)",
      border: `1px solid ${d ? "var(--accent-violet)" : "var(--line)"}`,
      borderRadius: 10,
      outline: "none"
    }
  }))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: onContinue,
    style: {
      width: "100%",
      justifyContent: "center"
    },
    iconRight: "arrow-right"
  }, "Verify & continue"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep("email"),
    style: {
      marginTop: 14,
      width: "100%",
      background: "transparent",
      border: "none",
      color: "var(--fg-3)",
      fontFamily: "var(--font-body)",
      fontSize: 13,
      cursor: "pointer"
    }
  }, "\u2190 Use a different email"))));
}
Object.assign(window, {
  LoginScreen
});
Object.assign(__ds_scope, { LoginScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/upscale-app/components/LoginScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/upscale-app/components/Primitives.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
const {
  useState
} = React;

// =============================================================================
// Primitives — the atom layer. Re-used by every other component in the kit.
// =============================================================================

// Render Lucide icons as inline React SVG.
// We DO NOT use lucide.createIcons() — that mutates the DOM outside React's
// control and breaks reconciliation when sibling icons re-render. Instead we
// pull each icon's node-array (`["svg", attrs, children]`) from window.lucide
// and recreate it as React elements.
function _nodeToReact(node, key) {
  if (!Array.isArray(node)) return null;
  const [tag, attrs = {}, children] = node;
  // Lucide attrs are kebab-case (stroke-width). Convert minimally to camelCase
  // for the ones React actually requires.
  const reactAttrs = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "stroke-width") reactAttrs.strokeWidth = v;else if (k === "stroke-linecap") reactAttrs.strokeLinecap = v;else if (k === "stroke-linejoin") reactAttrs.strokeLinejoin = v;else if (k === "fill-rule") reactAttrs.fillRule = v;else if (k === "clip-rule") reactAttrs.clipRule = v;else reactAttrs[k] = v;
  }
  reactAttrs.key = key;
  const kids = Array.isArray(children) ? children.map((c, i) => _nodeToReact(c, i)) : null;
  return React.createElement(tag, reactAttrs, kids);
}
function _kebabToPascal(name) {
  return name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}
function Icon({
  name,
  size = 16,
  className = "",
  style = {}
}) {
  const pascal = _kebabToPascal(name);
  const icon = window.lucide && window.lucide[pascal];
  if (!icon || !Array.isArray(icon)) {
    // Placeholder while lucide loads or for unknown name
    return /*#__PURE__*/React.createElement("span", {
      style: {
        width: size,
        height: size,
        display: "inline-block",
        ...style
      },
      className: className
    });
  }
  const [, attrs = {}, children = []] = icon;
  const reactAttrs = {
    width: size,
    height: size,
    viewBox: attrs.viewBox || "0 0 24 24",
    fill: attrs.fill || "none",
    stroke: "currentColor",
    strokeWidth: attrs["stroke-width"] || 1.5,
    strokeLinecap: attrs["stroke-linecap"] || "round",
    strokeLinejoin: attrs["stroke-linejoin"] || "round",
    style: {
      display: "inline-block",
      verticalAlign: "middle",
      flexShrink: 0,
      ...style
    },
    className,
    "aria-hidden": "true"
  };
  return React.createElement("svg", reactAttrs, children.map((c, i) => _nodeToReact(c, i)));
}
function Button({
  variant = "primary",
  size = "md",
  children,
  onClick,
  disabled,
  icon,
  iconRight,
  style,
  ...rest
}) {
  const base = {
    fontFamily: "var(--font-body)",
    fontWeight: 500,
    border: "1px solid transparent",
    borderRadius: size === "sm" ? 6 : size === "lg" ? 12 : 10,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "all 140ms cubic-bezier(.2,.8,.2,1)",
    opacity: disabled ? 0.4 : 1,
    fontSize: size === "sm" ? 12 : size === "lg" ? 16 : 14,
    padding: size === "sm" ? "6px 12px" : size === "lg" ? "14px 24px" : "10px 18px",
    whiteSpace: "nowrap"
  };
  const variants = {
    primary: {
      background: "var(--accent-violet)",
      color: "var(--fg-on-accent)"
    },
    secondary: {
      background: "rgba(238,244,255,.06)",
      borderColor: "rgba(238,244,255,.10)",
      color: "var(--fg-1)"
    },
    ghost: {
      background: "transparent",
      color: "var(--fg-2)"
    },
    destructive: {
      background: "rgba(255,90,122,.14)",
      color: "var(--negative)",
      borderColor: "rgba(255,90,122,.3)"
    },
    positive: {
      background: "rgba(0,212,255,.14)",
      color: "var(--accent-cyan)",
      borderColor: "rgba(0,212,255,.3)"
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    onClick: disabled ? undefined : onClick,
    style: {
      ...base,
      ...variants[variant],
      ...style
    },
    onMouseEnter: e => {
      if (disabled) return;
      if (variant === "primary") e.currentTarget.style.background = "var(--accent-violet-hi)";
      if (variant === "secondary") e.currentTarget.style.background = "rgba(238,244,255,.10)";
      if (variant === "ghost") e.currentTarget.style.background = "rgba(238,244,255,.04)";
    },
    onMouseLeave: e => {
      if (disabled) return;
      e.currentTarget.style.background = variants[variant].background;
    }
  }, rest), icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: size === "sm" ? 14 : 16
  }), children, iconRight && /*#__PURE__*/React.createElement(Icon, {
    name: iconRight,
    size: size === "sm" ? 14 : 16
  }));
}
function Pill({
  tone = "neutral",
  live,
  children,
  style
}) {
  const tones = {
    neutral: {
      bg: "rgba(238,244,255,.06)",
      fg: "var(--fg-2)",
      bd: "rgba(238,244,255,.10)"
    },
    positive: {
      bg: "rgba(0,212,255,.14)",
      fg: "var(--accent-cyan)",
      bd: "rgba(0,212,255,.3)"
    },
    negative: {
      bg: "rgba(255,90,122,.14)",
      fg: "var(--negative)",
      bd: "rgba(255,90,122,.3)"
    },
    warning: {
      bg: "rgba(255,178,63,.14)",
      fg: "var(--warning)",
      bd: "rgba(255,178,63,.3)"
    },
    brand: {
      bg: "rgba(124,92,252,.18)",
      fg: "var(--accent-violet-hi)",
      bd: "rgba(124,92,252,.4)"
    }
  };
  const t = tones[tone];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-body)",
      fontSize: 12,
      fontWeight: 500,
      padding: "4px 10px",
      borderRadius: 999,
      background: t.bg,
      color: t.fg,
      border: `1px solid ${t.bd}`,
      ...style
    }
  }, live && /*#__PURE__*/React.createElement(LiveDot, {
    color: t.fg
  }), children);
}
function LiveDot({
  color = "var(--accent-cyan)"
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, `
        @keyframes upx-pulse {
          0% { box-shadow: 0 0 0 0 currentColor; }
          70% { box-shadow: 0 0 0 6px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
      `), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: color,
      color,
      animation: "upx-pulse 1.6s infinite cubic-bezier(.2,.8,.2,1)"
    }
  }));
}
function Card({
  children,
  style,
  hoverable,
  brand
}) {
  const [hover, setHover] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: hoverable ? () => setHover(true) : undefined,
    onMouseLeave: hoverable ? () => setHover(false) : undefined,
    style: {
      background: brand ? "linear-gradient(135deg, rgba(124,92,252,.18), rgba(0,212,255,.10))" : "var(--bg-elevated)",
      border: `1px solid ${brand ? "rgba(124,92,252,.4)" : hover ? "var(--line-strong)" : "var(--line)"}`,
      borderRadius: 14,
      boxShadow: hover ? "0 1px 0 rgba(238,244,255,.05) inset, 0 6px 24px -8px rgba(3,6,15,.7)" : "0 1px 0 rgba(238,244,255,.04) inset, 0 1px 2px rgba(3,6,15,.6)",
      transition: "all 220ms cubic-bezier(.2,.8,.2,1)",
      ...style
    }
  }, children);
}
function Field({
  label,
  helper,
  error,
  value,
  onChange,
  placeholder,
  type = "text",
  prefix,
  suffix,
  style
}) {
  const [focus, setFocus] = useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "var(--fg-3)",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      fontWeight: 500,
      marginBottom: 6
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "var(--bg-deep)",
      border: `1px solid ${error ? "var(--negative)" : focus ? "var(--accent-violet)" : "var(--line)"}`,
      borderRadius: 6,
      padding: "10px 12px",
      boxShadow: focus ? "0 0 0 2px var(--bg-ink), 0 0 0 4px var(--accent-violet)" : "none",
      transition: "all 140ms cubic-bezier(.2,.8,.2,1)"
    }
  }, prefix && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, prefix), /*#__PURE__*/React.createElement("input", {
    type: type,
    value: value ?? "",
    onChange: onChange,
    placeholder: placeholder,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      background: "transparent",
      border: "none",
      outline: "none",
      fontFamily: "var(--font-body)",
      fontSize: 14,
      color: "var(--fg-1)",
      minWidth: 0
    }
  }), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, suffix)), (helper || error) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: error ? "var(--negative)" : "var(--fg-3)",
      marginTop: 4
    }
  }, error || helper));
}
function SegmentedControl({
  options,
  value,
  onChange,
  size = "md"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      background: "var(--bg-deep)",
      border: "1px solid var(--line)",
      borderRadius: 999,
      padding: 3
    }
  }, options.map(opt => {
    const k = typeof opt === "string" ? opt : opt.value;
    const label = typeof opt === "string" ? opt : opt.label;
    const active = value === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => onChange(k),
      style: {
        fontFamily: "var(--font-body)",
        fontWeight: 500,
        fontSize: size === "sm" ? 12 : 13,
        padding: size === "sm" ? "4px 10px" : "6px 14px",
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        background: active ? "var(--accent-violet)" : "transparent",
        color: active ? "var(--fg-on-accent)" : "var(--fg-2)",
        transition: "all 140ms cubic-bezier(.2,.8,.2,1)"
      }
    }, label);
  }));
}
function Eyebrow({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 11,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--fg-3)",
      fontWeight: 500,
      ...style
    }
  }, children);
}
function Num({
  children,
  size = 14,
  color = "var(--fg-1)",
  weight = 400,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: size,
      color,
      fontWeight: weight,
      letterSpacing: size >= 28 ? "-0.02em" : 0,
      ...style
    }
  }, children);
}

// formatters
const fmtIDR = n => "Rp " + n.toLocaleString("id-ID");
const fmtPct = n => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2) + "%";
function Primitives() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 16,
      padding: 24,
      background: "var(--bg-ink)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary"
  }, "Primary"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary"
  }, "Secondary"), /*#__PURE__*/React.createElement(Pill, {
    tone: "positive",
    live: true
  }, "Live"), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement(Num, {
    size: 20,
    weight: 600
  }, fmtIDR(4260000))));
}
Object.assign(window, {
  Icon,
  Button,
  Pill,
  LiveDot,
  Card,
  Field,
  SegmentedControl,
  Eyebrow,
  Num,
  fmtIDR,
  fmtPct,
  Primitives
});
Object.assign(__ds_scope, { Primitives });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/upscale-app/components/Primitives.jsx", error: String((e && e.message) || e) }); }

// ui_kits/upscale-app/components/PropertyDashboard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React, Card, Eyebrow, Num, Pill, SegmentedControl, Button, Icon, fmtIDR */
const {
  useState,
  useEffect
} = React;

// =============================================================================
// PropertyDashboard — KPI hero, AI insight, today's flow, occupancy outlook.
// =============================================================================

function PropertyDashboard({
  onOpenReservation
}) {
  const [range, setRange] = useState("7D");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 28px",
      maxWidth: 1280
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 12,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 32,
      letterSpacing: "-0.02em",
      color: "var(--fg-1)",
      margin: 0
    }
  }, "Tonight"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, "Tuesday \xB7 12 May 2026, 14:32 WIB \xB7 Aloft Bali Seminyak")), /*#__PURE__*/React.createElement(KpiRow, null), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      position: "relative",
      padding: "16px 20px 16px 26px",
      borderRadius: 14,
      background: "var(--bg-elevated)",
      border: "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      top: 16,
      bottom: 16,
      width: 2,
      borderRadius: 2,
      background: "linear-gradient(180deg, var(--accent-violet), var(--accent-cyan))"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 14,
      right: 16,
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      color: "var(--ai-fg)",
      fontFamily: "var(--font-body)",
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: "0.14em",
      textTransform: "uppercase"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 11
  }), " AI"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: 600,
      color: "var(--fg-1)",
      fontSize: 15,
      paddingRight: 50
    }
  }, "Raise Saturday rate by 12% \u2014 leave less on the table"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "var(--fg-2)",
      marginTop: 4,
      lineHeight: 1.5
    }
  }, "Compset average is ", /*#__PURE__*/React.createElement(Num, null, "Rp 1.580k"), " for Sat 16 May. Your published rate is ", /*#__PURE__*/React.createElement(Num, null, "Rp 1.420k"), ". At projected 92% occupancy that's ", /*#__PURE__*/React.createElement(Num, {
    color: "var(--accent-cyan)"
  }, "+Rp 17.6M"), " in revenue."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "Apply suggestion"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm"
  }, "Review compset"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontFamily: "var(--font-body)",
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, "Confidence \xB7 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent-cyan)"
    }
  }, "High"), " \xB7 4 OTAs \xB7 14d demand"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.7fr 1fr",
      gap: 16,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "Occupancy outlook"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Num, {
    size: 22,
    weight: 600
  }, "92.5%"), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "var(--fg-3)",
      marginLeft: 6
    }
  }, "peak \xB7 Sat"))), /*#__PURE__*/React.createElement(SegmentedControl, {
    value: range,
    onChange: setRange,
    options: ["7D", "14D", "30D", "90D"]
  })), /*#__PURE__*/React.createElement(OccupancyBars, null)), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 22
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Channel mix \xB7 MTD"), /*#__PURE__*/React.createElement(ChannelBreakdown, null))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Arrivals today"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, "28 expected \xB7 12 arrived")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      marginTop: 8
    }
  }, ARRIVALS.map(g => /*#__PURE__*/React.createElement(ArrivalRow, _extends({
    key: g.id
  }, g, {
    onOpen: () => onOpenReservation(g)
  }))))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 22
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Activity feed"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      marginTop: 12,
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(ActivityRow, {
    tone: "positive",
    title: "Check-in complete",
    detail: "A. Rachman \xB7 room 312 \xB7 Deluxe Twin",
    time: "14:18"
  }), /*#__PURE__*/React.createElement(ActivityRow, {
    tone: "neutral",
    title: "Housekeeping cleared",
    detail: "Room 408 \xB7 ready to sell",
    time: "14:02"
  }), /*#__PURE__*/React.createElement(ActivityRow, {
    tone: "warning",
    title: "Late arrival flagged",
    detail: "J. Lindberg \xB7 ETA 22:10",
    time: "13:40"
  }), /*#__PURE__*/React.createElement(ActivityRow, {
    tone: "negative",
    title: "No-show",
    detail: "Room 117 \xB7 auto-released \xB7 Rp 980k charge",
    time: "11:30"
  })))));
}
function KpiRow() {
  const [val, setVal] = useState(1842530000);
  useEffect(() => {
    const t = setInterval(() => setVal(v => v + Math.round((Math.random() - 0.35) * 80000)), 1800);
    return () => clearInterval(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 22
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Revenue \xB7 MTD"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      whiteSpace: "nowrap"
    }
  }, /*#__PURE__*/React.createElement(Num, {
    size: 30,
    weight: 600
  }, fmtIDR(val))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: "positive"
  }, "+6.4%"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, "vs. last month"))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 22
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Occupancy"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Num, {
    size: 28,
    weight: 600
  }, "86.4%")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "var(--fg-3)",
      marginTop: 8
    }
  }, "104 of 120 rooms")), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 22
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "ADR"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Num, {
    size: 28,
    weight: 600
  }, "Rp 1.420k")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "var(--fg-3)",
      marginTop: 8
    }
  }, "avg daily rate")), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 22
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "RevPAR"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Num, {
    size: 28,
    weight: 600,
    color: "var(--accent-cyan)"
  }, "Rp 1.227k")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "var(--fg-3)",
      marginTop: 8
    }
  }, "+4.2% vs. last week")));
}
function OccupancyBars() {
  // 14-day bars
  const data = [{
    d: "Tue",
    v: 86
  }, {
    d: "Wed",
    v: 78
  }, {
    d: "Thu",
    v: 82
  }, {
    d: "Fri",
    v: 89
  }, {
    d: "Sat",
    v: 96,
    peak: true
  }, {
    d: "Sun",
    v: 92
  }, {
    d: "Mon",
    v: 71
  }, {
    d: "Tue",
    v: 74
  }, {
    d: "Wed",
    v: 80
  }, {
    d: "Thu",
    v: 85
  }, {
    d: "Fri",
    v: 90
  }, {
    d: "Sat",
    v: 94,
    peak: true
  }, {
    d: "Sun",
    v: 88
  }, {
    d: "Mon",
    v: 70
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 4,
      height: 180,
      paddingTop: 12
    }
  }, data.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      color: d.peak ? "var(--accent-cyan)" : "var(--fg-3)"
    }
  }, d.v), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: `${d.v * 1.3}px`,
      borderRadius: 4,
      background: d.peak ? "linear-gradient(180deg, var(--accent-cyan), rgba(0,212,255,.4))" : "linear-gradient(180deg, var(--accent-violet), rgba(124,92,252,.3))",
      opacity: i < 1 ? 0.5 : 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 10,
      color: "var(--fg-3)"
    }
  }, d.d))));
}
function ChannelBreakdown() {
  const channels = [{
    name: "Direct",
    pct: 38,
    color: "#7C5CFC"
  }, {
    name: "Booking.com",
    pct: 26,
    color: "#9B80FF"
  }, {
    name: "Agoda",
    pct: 18,
    color: "#00D4FF"
  }, {
    name: "Traveloka",
    pct: 12,
    color: "rgba(0,212,255,.5)"
  }, {
    name: "Expedia",
    pct: 6,
    color: "rgba(155,128,255,.5)"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: 10,
      borderRadius: 6,
      overflow: "hidden",
      marginBottom: 16
    }
  }, channels.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.name,
    style: {
      width: `${c.pct}%`,
      background: c.color
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, channels.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.name,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 2,
      background: c.color
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "var(--fg-2)",
      flex: 1
    }
  }, c.name), /*#__PURE__*/React.createElement(Num, {
    size: 13,
    color: "var(--fg-1)",
    weight: 500
  }, c.pct, "%")))));
}
const ARRIVALS = [{
  id: "r1",
  code: "AR",
  name: "Arif Rachman",
  room: "312",
  roomType: "Deluxe Twin",
  nights: 3,
  eta: "14:30",
  status: "in-house",
  total: 4260000,
  channel: "Booking.com"
}, {
  id: "r2",
  code: "SW",
  name: "Sari Wijaya",
  room: "408",
  roomType: "King Suite",
  nights: 2,
  eta: "16:00",
  status: "confirmed",
  vip: true,
  total: 6800000,
  channel: "Direct"
}, {
  id: "r3",
  code: "JL",
  name: "Jonas Lindberg",
  room: "205",
  roomType: "Superior Q",
  nights: 5,
  eta: "22:10",
  status: "late",
  total: 7100000,
  channel: "Agoda"
}, {
  id: "r4",
  code: "PM",
  name: "Putri Maharani",
  room: "510",
  roomType: "Suite Ocean",
  nights: 4,
  eta: "15:00",
  status: "confirmed",
  total: 9200000,
  channel: "Direct"
}];
function ArrivalRow({
  code,
  name,
  room,
  roomType,
  nights,
  eta,
  status,
  vip,
  total,
  channel,
  onOpen
}) {
  const pillMap = {
    "in-house": {
      tone: "positive",
      label: "In-house"
    },
    "confirmed": {
      tone: "brand",
      label: "Confirmed"
    },
    "late": {
      tone: "warning",
      label: "Late ETA"
    }
  };
  const p = pillMap[status];
  return /*#__PURE__*/React.createElement("button", {
    onClick: onOpen,
    style: {
      display: "grid",
      gridTemplateColumns: "40px 1fr 120px 90px 1fr",
      alignItems: "center",
      gap: 12,
      padding: "10px 0",
      borderTop: "1px solid var(--line-soft)",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      textAlign: "left",
      width: "100%"
    },
    onMouseEnter: e => e.currentTarget.style.background = "rgba(238,244,255,.03)",
    onMouseLeave: e => e.currentTarget.style.background = "transparent"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: "50%",
      background: "var(--bg-border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
      fontSize: 11,
      fontWeight: 600,
      color: "var(--accent-violet-hi)"
    }
  }, code), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "var(--fg-1)",
      fontWeight: 500
    }
  }, name), vip && /*#__PURE__*/React.createElement(Pill, {
    tone: "brand",
    style: {
      fontSize: 10,
      padding: "1px 6px"
    }
  }, "VIP")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, "Rm ", room, " \xB7 ", roomType, " \xB7 ", nights, "n \xB7 ", channel)), /*#__PURE__*/React.createElement(Num, {
    size: 13,
    style: {
      textAlign: "right"
    }
  }, eta), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: p.tone
  }, p.label)), /*#__PURE__*/React.createElement(Num, {
    size: 13,
    color: "var(--fg-2)",
    style: {
      textAlign: "right"
    }
  }, fmtIDR(total)));
}
function ActivityRow({
  tone,
  title,
  detail,
  time
}) {
  const colors = {
    positive: "var(--accent-cyan)",
    neutral: "var(--accent-violet-hi)",
    warning: "var(--warning)",
    negative: "var(--negative)"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: colors[tone],
      marginTop: 6,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "var(--fg-1)",
      fontWeight: 500
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, detail)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, time));
}
Object.assign(window, {
  PropertyDashboard,
  ARRIVALS
});
Object.assign(__ds_scope, { PropertyDashboard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/upscale-app/components/PropertyDashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/upscale-app/components/ReservationSlideOver.jsx
try { (() => {
/* global React, Button, Pill, Num, Eyebrow, Field, Icon, fmtIDR */
const {
  useState,
  useEffect
} = React;

// =============================================================================
// ReservationSlideOver — guest + stay + folio. Opened from any reservation row
// or tape-chart block, also used to create new ones.
// =============================================================================

function ReservationSlideOver({
  open,
  reservation,
  onClose,
  onSave
}) {
  const [tab, setTab] = useState("stay");
  useEffect(() => {
    if (open) setTab("stay");
  }, [open]);
  if (!open || !reservation) return null;
  const isNew = reservation.id === "new";
  const r = isNew ? {
    id: "new",
    guest: "",
    room: "",
    roomType: "Deluxe Twin",
    nights: 1,
    status: "tentative",
    channel: "Direct",
    rate: 1420000,
    eta: "15:00"
  } : {
    ...DEFAULTS,
    ...reservation
  };
  const total = (r.rate || 1420000) * (r.nights || 1);
  const tax = Math.round(total * 0.11);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 100,
      background: "rgba(3,6,15,.72)",
      backdropFilter: "blur(6px)",
      display: "flex",
      justifyContent: "flex-end"
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("aside", {
    onClick: e => e.stopPropagation(),
    style: {
      width: 480,
      height: "100%",
      background: "var(--bg-elevated)",
      borderLeft: "1px solid var(--line)",
      boxShadow: "0 24px 60px -16px rgba(3,6,15,.9)",
      display: "flex",
      flexDirection: "column",
      animation: "upx-slide-in 220ms cubic-bezier(.2,.8,.2,1)"
    }
  }, /*#__PURE__*/React.createElement("style", null, `@keyframes upx-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }`), /*#__PURE__*/React.createElement("header", {
    style: {
      padding: 20,
      borderBottom: "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, isNew ? "New reservation" : `Reservation · ${reservation.id?.toUpperCase() || ""}`), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "transparent",
      border: "none",
      color: "var(--fg-2)",
      cursor: "pointer",
      display: "inline-flex"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: "50%",
      background: "var(--bg-border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      color: "var(--accent-violet-hi)"
    }
  }, (r.guest || "G G").split(" ").map(p => p[0]).slice(0, 2).join("")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 16,
      color: "var(--fg-1)",
      fontWeight: 600
    }
  }, r.guest || "New guest"), r.vip && /*#__PURE__*/React.createElement(Pill, {
    tone: "brand"
  }, "VIP")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, r.channel || "Direct", " \xB7 ", r.email || "guest@example.com")), /*#__PURE__*/React.createElement(ResStatusPill, {
    status: r.status
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      padding: "0 8px",
      borderBottom: "1px solid var(--line)"
    }
  }, [["stay", "Stay"], ["folio", "Folio"], ["guest", "Guest"]].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setTab(k),
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      fontWeight: 500,
      padding: "10px 14px",
      color: tab === k ? "var(--fg-1)" : "var(--fg-2)",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      borderBottom: tab === k ? "2px solid var(--accent-violet)" : "2px solid transparent",
      marginBottom: -1
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      flex: 1,
      overflow: "auto"
    }
  }, tab === "stay" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Check-in",
    value: "12 May 2026",
    suffix: r.eta || "15:00"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Check-out",
    value: `${12 + (r.nights || 3)} May 2026`,
    suffix: "12:00"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Room",
    value: r.room || "—",
    prefix: "#"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Room type",
    value: r.roomType || "Deluxe Twin"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Nights",
    value: String(r.nights || 1)
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Adults / Children",
    value: "2 / 0"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      padding: "12px 14px 12px 18px",
      borderRadius: 10,
      background: "rgba(238,244,255,.03)",
      border: "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      top: 12,
      bottom: 12,
      width: 2,
      borderRadius: 2,
      background: "linear-gradient(180deg, var(--accent-violet), var(--accent-cyan))"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontFamily: "var(--font-body)",
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--ai-fg)",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 10
  }), " AI"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "var(--fg-2)",
      lineHeight: 1.5
    }
  }, "Returning guest \xB7 preferred high-floor sea-view (last 2 stays). Auto-upgrade to ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--fg-1)",
      fontWeight: 500
    }
  }, "room 510"), " available at no extra cost."))), tab === "folio" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      background: "var(--bg-deep)",
      borderRadius: 10,
      border: "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement(FolioRow, {
    label: `${r.nights || 3} × ${r.roomType || "Deluxe Twin"}`,
    amount: total,
    note: `@ ${fmtIDR(r.rate || 1420000)}/n`
  }), /*#__PURE__*/React.createElement(FolioRow, {
    label: "Breakfast",
    amount: r.nights * 220000,
    note: `@ Rp 220k/n`
  }), /*#__PURE__*/React.createElement(FolioRow, {
    label: "Spa \xB7 60 min",
    amount: 650000,
    note: "Charged 11 May"
  }), /*#__PURE__*/React.createElement(FolioRow, {
    label: "Tax \xB7 service 21%",
    amount: tax,
    note: "GoI \xB7 11% + service 10%"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--line)",
      margin: "10px 0"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "var(--fg-1)",
      fontWeight: 600
    }
  }, "Balance due"), /*#__PURE__*/React.createElement(Num, {
    size: 18,
    weight: 600
  }, fmtIDR(total + r.nights * 220000 + 650000 + tax)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    icon: "credit-card"
  }, "Charge card"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    icon: "receipt"
  }, "Print folio"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    icon: "banknote"
  }, "Cash"))), tab === "guest" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Field, {
    label: "Full name",
    value: r.guest || ""
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Email",
    value: r.email || "arif@example.com"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Phone",
    value: "+62 812 3456 7890"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "ID type",
    value: "KTP"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "ID number",
    value: "3201\xB7\xB7\xB7\xB73201"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Special requests",
    value: "Late check-in \xB7 sea view if available."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Pill, null, "Returning \xB7 3 stays"), /*#__PURE__*/React.createElement(Pill, {
    tone: "brand"
  }, "Loyalty \xB7 Gold"), /*#__PURE__*/React.createElement(Pill, {
    tone: "positive"
  }, "Verified")))), /*#__PURE__*/React.createElement("footer", {
    style: {
      padding: 20,
      borderTop: "1px solid var(--line)",
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: onClose,
    style: {
      flex: 1
    }
  }, "Close"), r.status === "confirmed" || r.status === "tentative" ? /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: () => onSave({
      ...r,
      status: "inhouse"
    }),
    style: {
      flex: 2
    },
    icon: "log-in"
  }, "Check in") : r.status === "inhouse" ? /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: () => onSave({
      ...r,
      status: "departed"
    }),
    style: {
      flex: 2
    },
    icon: "log-out"
  }, "Check out") : /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: () => onSave({
      ...r,
      status: "confirmed"
    }),
    style: {
      flex: 2
    },
    icon: "check"
  }, "Confirm reservation"))));
}
const DEFAULTS = {
  rate: 1420000,
  nights: 3,
  roomType: "Deluxe Twin",
  room: "312",
  email: "guest@example.com",
  channel: "Direct",
  eta: "15:00"
};
function ResStatusPill({
  status
}) {
  const map = {
    tentative: {
      tone: "warning",
      label: "Tentative"
    },
    confirmed: {
      tone: "brand",
      label: "Confirmed"
    },
    inhouse: {
      tone: "positive",
      label: "In-house"
    },
    departed: {
      tone: "neutral",
      label: "Departed"
    },
    cancelled: {
      tone: "negative",
      label: "Cancelled"
    }
  };
  const p = map[status] || map.confirmed;
  return /*#__PURE__*/React.createElement(Pill, {
    tone: p.tone
  }, p.label);
}
function FolioRow({
  label,
  amount,
  note
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      padding: "6px 0"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "var(--fg-1)"
    }
  }, label), note && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, note)), /*#__PURE__*/React.createElement(Num, {
    size: 13,
    weight: 500
  }, fmtIDR(amount)));
}
Object.assign(window, {
  ReservationSlideOver
});
Object.assign(__ds_scope, { ReservationSlideOver });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/upscale-app/components/ReservationSlideOver.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AppShell = __ds_scope.AppShell;

__ds_ns.CalendarTapeChart = __ds_scope.CalendarTapeChart;

__ds_ns.CommandPalette = __ds_scope.CommandPalette;

__ds_ns.HousekeepingBoard = __ds_scope.HousekeepingBoard;

__ds_ns.LoginScreen = __ds_scope.LoginScreen;

__ds_ns.Primitives = __ds_scope.Primitives;

__ds_ns.PropertyDashboard = __ds_scope.PropertyDashboard;

__ds_ns.ReservationSlideOver = __ds_scope.ReservationSlideOver;

})();
