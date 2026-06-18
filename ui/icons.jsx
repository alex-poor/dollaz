// icons.jsx — Lucide-style inline SVG. 24x24 viewBox, stroke=currentColor, 1.75 weight.
// ICONS[name] returns the inner paths; <Icon name/> wraps in a sized <svg>.
(function () {
  const P = React.createElement;

  // each entry: array of element specs OR a function returning children
  const PATHS = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
    wallet: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a1 1 0 0 1 1 1v1"/><path d="M3 7.5V18a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3"/><path d="M20 9.5h-4.5a2 2 0 0 0 0 4H20a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5Z"/></>,
    analysis: <><path d="M3 3v17a1 1 0 0 0 1 1h17"/><path d="M7 15l3.5-4 3 2.5L20 7"/></>,
    transactions: <><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/><circle cx="18" cy="18" r="2.5"/></>,
    importIcon: <><path d="M12 3v11"/><path d="m8 10 4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></>,
    categories: <><path d="M3 7.5 11 4l8 3.5v8L11 19l-8-3.5Z"/><path d="M3 7.5 11 11l8-3.5"/><path d="M11 11v8"/></>,
    tag: <><path d="M3 7.5v4.6a2 2 0 0 0 .6 1.4l7 7a2 2 0 0 0 2.8 0l4.6-4.6a2 2 0 0 0 0-2.8l-7-7A2 2 0 0 0 9.6 5.5H5a2 2 0 0 0-2 2Z"/><circle cx="8" cy="9" r="1.2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" transform="translate(2 2) scale(0.83)"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/></>,
    undo: <><path d="M9 7 4 12l5 5"/><path d="M4 12h11a5 5 0 0 1 0 10h-1"/></>,
    redo: <><path d="m15 7 5 5-5 5"/><path d="M20 12H9a5 5 0 0 0 0 10h1"/></>,
    lock: <><rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    arrowUp: <><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></>,
    arrowDown: <><path d="M12 5v14"/><path d="m6 13 6 6 6-6"/></>,
    trendUp: <><path d="M3 17 9 11l4 4 8-8"/><path d="M16 7h5v5"/></>,
    trendDown: <><path d="M3 7 9 13l4-4 8 8"/><path d="M16 17h5v-5"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    x: <><path d="m6 6 12 12"/><path d="m18 6-12 12"/></>,
    check: <><path d="m5 12 4.5 4.5L19 7"/></>,
    chevronDown: <><path d="m6 9 6 6 6-6"/></>,
    chevronRight: <><path d="m9 6 6 6-6 6"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    moon: <><path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z"/></>,
    piggy: <><path d="M19 9.5c1 .4 1.6 1.3 1.6 2.3v3.2c0 .8-.5 1.5-1.3 1.8l-.4.7v1a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-.5H9.5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-1.2A5 5 0 0 1 4 14.5C4 11 7.1 8.5 11 8.5h2.5a5.5 5.5 0 0 1 2.5.6"/><path d="M15 8.5a3 3 0 0 0-3.5-3"/><circle cx="8" cy="13" r="0.7" fill="currentColor"/><path d="M3.5 12.5H4"/></>,
    shield: <><path d="M12 3 5 6v5c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6Z"/><path d="m9 12 2 2 4-4"/></>,
    alert: <><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 4 3.5 16a2 2 0 0 0 1.7 3h13.6a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z"/></>,
    sparkles: <><path d="M12 4 13.4 9 18 10.4 13.4 11.8 12 17 10.6 11.8 6 10.4 10.6 9Z"/><path d="M18 4v3M19.5 5.5h-3"/></>,
    growth: <><path d="M7 17V9M12 17V5M17 17v-6"/><path d="M4 21h16"/></>,
    bank: <><path d="M3 9 12 4l9 5"/><path d="M5 9v8M9 9v8M15 9v8M19 9v8"/><path d="M3 20h18"/></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 9.5h18"/><path d="M6.5 14.5h3"/></>,
    coins: <><ellipse cx="9" cy="7" rx="5.5" ry="2.6"/><path d="M3.5 7v4c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6V7"/><path d="M3.5 11v4c0 1.4 2.5 2.6 5.5 2.6 1 0 2-.1 2.8-.4"/><ellipse cx="16" cy="15" rx="4.5" ry="2.2"/><path d="M11.5 15v3c0 1.2 2 2.2 4.5 2.2s4.5-1 4.5-2.2v-3"/></>,
    target: <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/></>,
    refresh: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>,
    filter: <><path d="M3 5h18l-7 8v6l-4-2v-4Z"/></>,
    download: <><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 19h16"/></>,
    dots: <><circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/></>,
    edit: <><path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17Z"/><path d="M14 7l3 3"/></>,
    trash: <><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/><path d="M10 11v6M14 11v6"/></>,
    flag: <><path d="M5 21V4"/><path d="M5 4h11l-2 3.5L16 11H5"/></>,
    leaf: <><path d="M5 19c0-7 5-12 14-12 0 9-5 14-12 14-1 0-2-.2-2-2Z"/><path d="M9 15c2-3 4-4 7-5"/></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5v1.5M12 19v1.5" opacity="0.5"/></>,
    send: <><path d="M5 12h13"/><path d="m12 5 7 7-7 7"/></>,
  };

  function Icon({ name, size = 24, style, strokeWidth = 1.75, ...rest }) {
    const children = PATHS[name];
    if (!children) return null;
    return P("svg", {
      width: size, height: size, viewBox: "0 0 24 24",
      fill: "none", stroke: "currentColor", strokeWidth,
      strokeLinecap: "round", strokeLinejoin: "round",
      style, ...rest,
    }, children);
  }

  window.ICONS = PATHS;
  window.Icon = Icon;
})();
