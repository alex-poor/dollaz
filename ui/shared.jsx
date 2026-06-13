// shared.jsx — primitives + hand-rolled inline-SVG charts (pixel-accurate).
// Reads { Icon } from window; registers all components on window.
(function () {
  const { useState, useRef, useLayoutEffect, useEffect, useMemo } = React;
  const { Icon } = window;

  /* ===================== helpers ===================== */
  function useMeasuredWidth() {
    const ref = useRef(null);
    const [w, setW] = useState(0);
    useLayoutEffect(() => {
      if (!ref.current) return;
      const ro = new ResizeObserver((entries) => {
        const cw = entries[0].contentRect.width;
        setW(cw);
      });
      ro.observe(ref.current);
      setW(ref.current.clientWidth);
      return () => ro.disconnect();
    }, []);
    return [ref, w];
  }

  function niceCeil(v) {
    if (v <= 0) return 10;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / pow;
    let mult;
    if (n <= 1) mult = 1; else if (n <= 2) mult = 2; else if (n <= 2.5) mult = 2.5;
    else if (n <= 5) mult = 5; else mult = 10;
    return mult * pow;
  }

  const CHART_PAD = { l: 56, r: 18, t: 16, b: 30 };

  /* ===================== Money ===================== */
  function Money({ value, colorSign, compact, sign, className = "", style, ...rest }) {
    const txt = window.fmtCurrency(value, { compact, sign: sign || colorSign });
    let color;
    if (colorSign) color = value > 0 ? "var(--pos)" : value < 0 ? "var(--neg)" : "var(--text-muted)";
    return <span className={"num " + className} style={{ color, ...style }} {...rest}>{txt}</span>;
  }

  /* ===================== Button ===================== */
  function Button({ variant, size, icon, iconName, children, className = "", ...rest }) {
    const cls = ["btn", variant, size, icon ? "icon" : "", className].filter(Boolean).join(" ");
    return (
      <button className={cls} {...rest}>
        {iconName && <Icon name={iconName} />}
        {children}
      </button>
    );
  }

  /* ===================== CatDot / pills ===================== */
  function CatDot({ color, lg }) {
    return <span className={"cat-dot" + (lg ? " lg" : "")} style={{ background: color }} />;
  }
  function CategoryPill({ cat, unmapped }) {
    if (unmapped || !cat || cat.id == null) {
      return <span className="cat-pill unmapped"><Icon name="alert" size={13} />Uncategorised</span>;
    }
    return <span className="cat-pill"><CatDot color={cat.color} />{cat.name}</span>;
  }
  function Delta({ value, invert, suffix = "%" }) {
    // value is a number; invert means "down is good"
    const up = value > 0, down = value < 0;
    const good = invert ? down : up;
    const cls = value === 0 ? "flat" : good ? "up" : "down";
    return (
      <span className={"delta " + cls}>
        {value !== 0 && <Icon name={up ? "trendUp" : "trendDown"} size={13} />}
        {(value > 0 ? "+" : "") + value}{suffix}
      </span>
    );
  }
  function Chip({ tone, iconName, children }) {
    return <span className={"chip " + (tone || "")}>{iconName && <Icon name={iconName} size={13} />}{children}</span>;
  }

  /* ===================== Sparkline ===================== */
  function Sparkline({ values, color = "var(--accent)", height = 34, fill = true, strokeWidth = 2 }) {
    const [ref, w] = useMeasuredWidth();
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    const W = w || 120, H = height, pad = 3;
    const pts = values.map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (W - pad * 2);
      const y = pad + (1 - (v - min) / span) * (H - pad * 2);
      return [x, y];
    });
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = line + ` L${pts[pts.length-1][0].toFixed(1)} ${H} L${pts[0][0].toFixed(1)} ${H} Z`;
    const gid = "spk" + useMemo(() => Math.random().toString(36).slice(2, 7), []);
    return (
      <div ref={ref} style={{ width: "100%", height: H }}>
        {w > 0 && (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {fill && <path d={area} fill={`url(#${gid})`} />}
            <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2.6" fill={color} />
          </svg>
        )}
      </div>
    );
  }

  /* ===================== StackedBar ===================== */
  function StackedBar({ segments, height = 14 }) {
    // segments: [{value, color, label}]
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    return (
      <div className="meter" style={{ height }}>
        {segments.map((s, i) => (
          <span key={i} title={s.label} style={{ width: (s.value / total) * 100 + "%", background: s.color }} />
        ))}
      </div>
    );
  }

  /* ===================== ChartLegend ===================== */
  function ChartLegend({ items }) {
    return (
      <div className="row" style={{ flexWrap: "wrap", gap: "8px 18px" }}>
        {items.map((it, i) => (
          <span key={i} className="row" style={{ gap: 7, fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
            <CatDot color={it.color} />{it.name}
          </span>
        ))}
      </div>
    );
  }

  /* ===================== Tooltip box ===================== */
  function Tip({ x, W, top, children }) {
    const flip = x > W * 0.6;
    return (
      <div style={{
        position: "absolute", left: x, top, transform: `translate(${flip ? "-100%" : "0"}, -50%)`,
        marginLeft: flip ? -10 : 10, pointerEvents: "none", zIndex: 5,
        background: "var(--surface)", border: "1px solid var(--gold-dim)",
        borderRadius: "var(--r)", boxShadow: "var(--shadow-lg)", padding: "10px 12px",
        minWidth: 138, fontSize: "0.86rem", fontFamily: "var(--font-body)",
      }}>{children}</div>
    );
  }

  /* ===================== BarsChart (engraved plate) ===================== */
  function BarsChart({ data, height = 240, showNet = true }) {
    const [ref, w] = useMeasuredWidth();
    const [hi, setHi] = useState(null);
    const uid = useMemo(() => "bc" + Math.random().toString(36).slice(2, 7), []);
    const W = w || 600, H = height;
    const maxV = niceCeil(Math.max(...data.flatMap((d) => [d.income, d.expenses])));
    const innerW = W - CHART_PAD.l - CHART_PAD.r;
    const innerH = H - CHART_PAD.t - CHART_PAD.b;
    const x0 = CHART_PAD.l, y0 = CHART_PAD.t, baseY = y0 + innerH;
    const yScale = (v) => y0 + innerH * (1 - v / maxV);
    const n = data.length, groupW = innerW / n;
    const barW = Math.min(10, groupW * 0.24);
    const step = Math.ceil(n / 12);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => maxV * f);
    const netLine = data.map((d, i) => [x0 + groupW * (i + 0.5), yScale(Math.max(0, d.net))]);
    function onMove(e) { const r = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - r.left) * (W / r.width); setHi(Math.max(0, Math.min(n - 1, Math.floor((px - x0) / groupW)))); }
    const hd = hi != null ? data[hi] : null;
    const hx = hi != null ? x0 + groupW * (hi + 0.5) : 0;
    const diamond = (x, y, c, r = 2.8) => <rect x={x - r} y={y - r} width={r * 2} height={r * 2} transform={`rotate(45 ${x} ${y})`} fill={c} stroke="var(--surface)" strokeWidth="1" />;
    return (
      <div ref={ref} style={{ position: "relative", width: "100%", height: H }}>
        {w > 0 && (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
            <defs>
              <pattern id={uid + "i"} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--pos)" strokeWidth="1.3" /></pattern>
              <pattern id={uid + "e"} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--neg)" strokeWidth="1.3" /></pattern>
            </defs>
            {ticks.map((t, i) => (
              <g key={i}>
                <line x1={x0} x2={x0 + innerW} y1={yScale(t)} y2={yScale(t)} stroke="var(--gold-dim)" strokeWidth="1" strokeDasharray="1 5" opacity="0.55" />
                <text x={x0 - 12} y={yScale(t) + 4} textAnchor="end" fontSize="10.5" fill="var(--text-dim)" fontFamily="JetBrains Mono, monospace">{window.fmtCurrency(t, { compact: true })}</text>
              </g>
            ))}
            {hi != null && <rect x={x0 + groupW * hi} y={y0} width={groupW} height={innerH} fill="color-mix(in srgb, var(--gold) 7%, transparent)" />}
            <line x1={x0} x2={x0 + innerW} y1={baseY} y2={baseY} stroke="var(--gold)" strokeWidth="1.4" />
            {data.map((d, i) => {
              const cx = x0 + groupW * (i + 0.5), dim = hi != null && hi !== i ? 0.4 : 1;
              const ix = cx - barW - 1.5, ex = cx + 1.5, iY = yScale(d.income), eY = yScale(d.expenses);
              return (
                <g key={i} opacity={dim}>
                  <rect x={ix} y={iY} width={barW} height={baseY - iY} fill="var(--pos)" opacity="0.16" />
                  <rect x={ix} y={iY} width={barW} height={baseY - iY} fill={`url(#${uid}i)`} />
                  <rect x={ix} y={iY} width={barW} height={baseY - iY} fill="none" stroke="var(--pos)" strokeWidth="0.9" />
                  <rect x={ex} y={eY} width={barW} height={baseY - eY} fill="var(--neg)" opacity="0.16" />
                  <rect x={ex} y={eY} width={barW} height={baseY - eY} fill={`url(#${uid}e)`} />
                  <rect x={ex} y={eY} width={barW} height={baseY - eY} fill="none" stroke="var(--neg)" strokeWidth="0.9" />
                  {(i % step === 0) && <text x={cx} y={H - 9} textAnchor="middle" fontSize="11" fill="var(--text-dim)" fontFamily="EB Garamond, serif" fontStyle="italic">{window.fmtMonth(d.ym)}</text>}
                </g>
              );
            })}
            {showNet && <path d={netLine.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ")} fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinejoin="round" />}
            {showNet && netLine.map((p, i) => <g key={i} opacity={hi != null && hi !== i ? 0.4 : 1}>{diamond(p[0], p[1], "var(--gold)", hi === i ? 4 : 2.8)}</g>)}
            {hi != null && <line x1={hx} x2={hx} y1={y0} y2={baseY} stroke="var(--gold)" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.7" />}
          </svg>
        )}
        {hd && (
          <Tip x={hx} W={W} top={CHART_PAD.t + 30}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-strong)", marginBottom: 5 }}>{window.fmtMonth(hd.ym)}</div>
            <Row c="var(--pos)" k="Income" v={hd.income} />
            <Row c="var(--neg)" k="Expenses" v={hd.expenses} />
            <div style={{ borderTop: "1px solid var(--gold-dim)", marginTop: 5, paddingTop: 5 }}>
              <Row c="var(--gold)" k="Surplus" v={hd.net} sign />
            </div>
          </Tip>
        )}
      </div>
    );
  }
  function Row({ c, k, v, sign }) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", padding: "1px 0" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          <span style={{ width: 8, height: 8, transform: "rotate(45deg)", background: c }} />{k}
        </span>
        <Money value={v} className="" style={{ fontWeight: 600, color: "var(--text-strong)" }} sign={sign} />
      </div>
    );
  }

  /* ===================== LineChart (engraved) ===================== */
  function LineChart({ series, months, height = 260, forecastFrom = null, area = false, band = null }) {
    const [ref, w] = useMeasuredWidth();
    const [hi, setHi] = useState(null);
    const W = w || 600, H = height;
    const all = series.flatMap((s) => s.values).concat(band ? [...band.lower, ...band.upper].filter((v) => v != null) : []);
    const hiV = niceCeil(Math.max(...all, 1));
    const loRaw = Math.min(0, ...all);
    const loV = loRaw < 0 ? -niceCeil(-loRaw) : 0; // include zero; nice negative bound for surplus/deficit
    const range = (hiV - loV) || 1;
    const innerW = W - CHART_PAD.l - CHART_PAD.r;
    const innerH = H - CHART_PAD.t - CHART_PAD.b;
    const x0 = CHART_PAD.l, y0 = CHART_PAD.t, baseY = y0 + innerH;
    const n = months.length;
    const xAt = (i) => x0 + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const yAt = (v) => y0 + innerH * (1 - (v - loV) / range);
    const zeroY = yAt(0);
    const step = Math.ceil(n / 12);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => loV + range * f);
    const uid = useMemo(() => "lc" + Math.random().toString(36).slice(2, 7), []);
    const splitAt = forecastFrom != null ? forecastFrom : n - 1;
    function onMove(e) { const r = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - r.left) * (W / r.width); setHi(Math.max(0, Math.min(n - 1, Math.round((px - x0) / (innerW / (n - 1)))))); }
    const hx = hi != null ? xAt(hi) : 0;
    function pathFor(values, from, to) {
      return values.slice(from, to + 1).map((v, k) => { const i = from + k; return (k ? "L" : "M") + xAt(i).toFixed(1) + " " + yAt(v).toFixed(1); }).join(" ");
    }
    const diamond = (x, y, c) => <rect x={x - 3.5} y={y - 3.5} width="7" height="7" transform={`rotate(45 ${x} ${y})`} fill="var(--surface)" stroke={c} strokeWidth="1.8" />;
    return (
      <div ref={ref} style={{ position: "relative", width: "100%", height: H }}>
        {w > 0 && (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
            <defs>
              {series.map((s, i) => (
                <pattern key={i} id={uid + "h" + i} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke={s.color} strokeWidth="1.1" opacity="0.5" /></pattern>
              ))}
            </defs>
            {forecastFrom != null && <rect x={xAt(forecastFrom)} y={y0} width={x0 + innerW - xAt(forecastFrom)} height={innerH} fill="var(--surface-2)" opacity="0.6" />}
            {ticks.map((t, i) => (
              <g key={i}>
                <line x1={x0} x2={x0 + innerW} y1={yAt(t)} y2={yAt(t)} stroke="var(--gold-dim)" strokeWidth="1" strokeDasharray="1 5" opacity="0.5" />
                <text x={x0 - 12} y={yAt(t) + 4} textAnchor="end" fontSize="10.5" fill="var(--text-dim)" fontFamily="JetBrains Mono, monospace">{window.fmtCurrency(t, { compact: true })}</text>
              </g>
            ))}
            {months.map((m, i) => (i % step === 0) && <text key={i} x={xAt(i)} y={H - 9} textAnchor="middle" fontSize="11" fill="var(--text-dim)" fontFamily="EB Garamond, serif" fontStyle="italic">{window.fmtMonth(m)}</text>)}
            {forecastFrom != null && <line x1={xAt(forecastFrom)} x2={xAt(forecastFrom)} y1={y0} y2={baseY} stroke="var(--gold)" strokeWidth="0.9" strokeDasharray="3 3" opacity="0.6" />}
            {forecastFrom != null && <text x={xAt(forecastFrom) + 7} y={y0 + 12} fontSize="9.5" fill="var(--gold-dim)" fontFamily="EB Garamond, serif" fontStyle="italic" letterSpacing="0.18em">FORECAST</text>}
            {area && series.length === 1 && <path d={pathFor(series[0].values, 0, splitAt) + ` L${xAt(splitAt).toFixed(1)} ${zeroY.toFixed(1)} L${x0} ${zeroY.toFixed(1)} Z`} fill={`url(#${uid}h0)`} />}
            {band && (() => {
              const idx = months.map((_, i) => i).filter((i) => band.upper[i] != null && band.lower[i] != null);
              if (idx.length < 2) return null;
              const up = idx.map((i) => `${xAt(i).toFixed(1)} ${yAt(band.upper[i]).toFixed(1)}`);
              const lo = idx.slice().reverse().map((i) => `${xAt(i).toFixed(1)} ${yAt(band.lower[i]).toFixed(1)}`);
              return <path d={`M${up.join(' L')} L${lo.join(' L')} Z`} fill="var(--accent)" opacity="0.13" />;
            })()}
            <line x1={x0} x2={x0 + innerW} y1={zeroY} y2={zeroY} stroke="var(--gold)" strokeWidth="1.2" opacity="0.7" />
            {series.map((s, si) => (
              <g key={si}>
                <path d={pathFor(s.values, 0, splitAt)} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" />
                {forecastFrom != null && <path d={pathFor(s.values, splitAt, n - 1)} fill="none" stroke={s.color} strokeWidth="2.2" strokeDasharray="5 4" opacity="0.85" />}
              </g>
            ))}
            {hi != null && <line x1={hx} x2={hx} y1={y0} y2={baseY} stroke="var(--gold)" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.7" />}
            {hi != null && series.map((s, si) => <g key={si}>{diamond(hx, yAt(s.values[hi]), s.color)}</g>)}
          </svg>
        )}
        {hi != null && (
          <Tip x={hx} W={W} top={CHART_PAD.t + 20}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-strong)", marginBottom: 5 }}>{window.fmtMonth(months[hi])}</div>
            {series.map((s, i) => <Row key={i} c={s.color} k={s.name} v={s.values[hi]} />)}
          </Tip>
        )}
      </div>
    );
  }

  /* ===================== Manuscript devices ===================== */
  function Corners({ inset = 9, size = 28, color = "var(--gold)" }) {
    const c = (
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round">
        <path d="M3 26V11C3 6 6 3 11 3h15" />
        <path d="M3 17c5 0 8-3 8-8" />
        <circle cx="3" cy="26" r="1.4" fill={color} stroke="none" />
        <path d="M14 3c2.5 1 4 3 4 5" opacity="0.7" />
      </svg>
    );
    const base = { position: "absolute", width: size, height: size, pointerEvents: "none", zIndex: 2, opacity: 0.85 };
    return (
      <>
        <span style={{ ...base, left: inset, top: inset }}>{c}</span>
        <span style={{ ...base, right: inset, top: inset, transform: "scaleX(-1)" }}>{c}</span>
        <span style={{ ...base, left: inset, bottom: inset, transform: "scaleY(-1)" }}>{c}</span>
        <span style={{ ...base, right: inset, bottom: inset, transform: "scale(-1,-1)" }}>{c}</span>
      </>
    );
  }

  function Headpiece({ title, sub }) {
    return (
      <div style={{ textAlign: "center", margin: "0 0 var(--s2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center" }}>
          <span style={{ flex: 1, maxWidth: 200, height: 1, background: "linear-gradient(90deg, transparent, var(--gold-dim))" }} />
          <span style={{ fontFamily: "var(--font-body)", fontStyle: "italic", letterSpacing: "0.22em", textTransform: "uppercase", fontSize: "0.8rem", color: "var(--gold)", whiteSpace: "nowrap" }}>✦ {title} ✦</span>
          <span style={{ flex: 1, maxWidth: 200, height: 1, background: "linear-gradient(270deg, transparent, var(--gold-dim))" }} />
        </div>
        {sub && <div style={{ fontFamily: "var(--font-body)", fontStyle: "italic", color: "var(--text-dim)", fontSize: "0.9rem", marginTop: 4 }}>{sub}</div>}
      </div>
    );
  }

  function Laurel({ size = 230, color = "var(--gold)" }) {
    const cx = size / 2, cy = size / 2, R = size * 0.42;
    const leaves = [];
    const a0 = 105, a1 = 435, count = 19;
    for (let i = 0; i < count; i++) {
      const deg = a0 + (a1 - a0) * (i / (count - 1));
      const a = deg * Math.PI / 180;
      const lx = cx + Math.cos(a) * R, ly = cy + Math.sin(a) * R;
      const rot = deg + 90;
      leaves.push(<ellipse key={i} cx={lx} cy={ly} rx="3" ry="9" fill="none" stroke={color} strokeWidth="1.1" transform={`rotate(${rot} ${lx} ${ly})`} opacity="0.8" />);
    }
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {leaves}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={color} strokeWidth="0.7" strokeDasharray="2 6" opacity="0.4" />
      </svg>
    );
  }

  /* ===================== Donut ===================== */
  function Donut({ segments, size = 160, thickness = 22, centerLabel, centerValue }) {
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    const r = (size - thickness) / 2;
    const c = 2 * Math.PI * r;
    let off = 0;
    return (
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
          {segments.map((s, i) => {
            const len = (s.value / total) * c;
            const el = <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} strokeLinecap="butt" />;
            off += len;
            return el;
          })}
        </svg>
        {centerValue != null && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", fontWeight: 600 }}>{centerLabel}</div>
              <div className="num" style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-strong)" }}>{centerValue}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ===================== EmptyState ===================== */
  function EmptyState({ iconName = "sparkles", title, children, action }) {
    return (
      <div className="empty">
        <div className="empty-icon"><Icon name={iconName} /></div>
        <h3>{title}</h3>
        <p>{children}</p>
        {action}
      </div>
    );
  }

  Object.assign(window, {
    useMeasuredWidth, niceCeil, CHART_PAD,
    Money, Button, CatDot, CategoryPill, Delta, Chip,
    Sparkline, StackedBar, ChartLegend, BarsChart, LineChart, Donut, EmptyState,
    Corners, Headpiece, Laurel,
  });
})();
