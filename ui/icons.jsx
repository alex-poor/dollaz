// icons.jsx — single-weight line icons (Lucide-style), 18px, stroke currentColor.
const ICONS = {};
function makeIcon(path) {
  return function Icon({ size = 18, className = '', style = {} }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
        className={className} style={style}>{path}</svg>
    );
  };
}

ICONS.Home = makeIcon(<><path d="M3 11l9-8 9 8"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></>);
ICONS.Dashboard = makeIcon(<><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/></>);
ICONS.Import = makeIcon(<><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/></>);
ICONS.Upload = makeIcon(<><path d="M12 19V7"/><path d="M7 12l5-5 5 5"/><path d="M4 19h16"/></>);
ICONS.Download = makeIcon(<><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/></>);
ICONS.Tag = makeIcon(<><path d="M3 11l8-8 9 9-8 8z"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" stroke="none"/></>);
ICONS.List = makeIcon(<><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/></>);
ICONS.TrendUp = makeIcon(<><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></>);
ICONS.ChartBar = makeIcon(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>);
ICONS.Coins = makeIcon(<><ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v5c0 1.7 2.7 3 6 3s6-1.3 6-3V6"/><path d="M15 11.5c2.4-.3 4.5-1.3 4.5-2.5"/><path d="M9 14v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-7"/></>);
ICONS.Wallet = makeIcon(<><path d="M3 7a2 2 0 0 1 2-2h12v4"/><path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5"/><circle cx="16" cy="13" r="1.3" fill="currentColor" stroke="none"/></>);
ICONS.Calendar = makeIcon(<><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></>);
ICONS.Plus = makeIcon(<><path d="M12 5v14M5 12h14"/></>);
ICONS.Search = makeIcon(<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></>);
ICONS.Chevron = makeIcon(<><path d="M9 6l6 6-6 6"/></>);
ICONS.ChevronDown = makeIcon(<><path d="M6 9l6 6 6-6"/></>);
ICONS.X = makeIcon(<><path d="M6 6l12 12M18 6L6 18"/></>);
ICONS.Check = makeIcon(<><path d="M5 12l5 5L20 7"/></>);
ICONS.Trash = makeIcon(<><path d="M3 6h18"/><path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/><path d="M9 3h6v3H9z"/></>);
ICONS.Info = makeIcon(<><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></>);
ICONS.Help = makeIcon(<><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4M12 17v.01"/></>);
ICONS.Edit = makeIcon(<><path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="M19 3l2 2-11 11H8v-2z"/></>);
ICONS.Arrow = makeIcon(<><path d="M5 12h14M13 5l7 7-7 7"/></>);
ICONS.ArrowBack = makeIcon(<><path d="M19 12H5M11 5l-7 7 7 7"/></>);
ICONS.Undo = makeIcon(<><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v0a6 6 0 0 1-6 6h-3"/></>);
ICONS.Redo = makeIcon(<><path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0-6 6v0a6 6 0 0 0 6 6h3"/></>);
ICONS.Settings = makeIcon(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.7 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.7.3 1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.7 1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></>);
ICONS.Sun = makeIcon(<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>);
ICONS.Moon = makeIcon(<><path d="M20 14.5A8 8 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></>);
ICONS.Sliders = makeIcon(<><path d="M4 6h7M14 6h6M4 12h3M10 12h10M4 18h12M18 18h2"/><circle cx="12" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></>);
ICONS.Warn = makeIcon(<><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.01"/></>);
ICONS.File = makeIcon(<><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/></>);
ICONS.Folder = makeIcon(<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>);

Object.assign(window, { ICONS });
