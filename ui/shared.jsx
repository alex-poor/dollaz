// shared.jsx — shared UI primitives + tiny dependency-free SVG charts.
const { ICONS } = window;

function Button({ children, variant = 'default', size, icon, onClick, disabled, title, type = 'button', className = '', ...rest }) {
  const cls = ['btn'];
  if (variant !== 'default') cls.push(variant);
  if (size) cls.push(size);
  if (className) cls.push(className);
  return (
    <button type={type} className={cls.join(' ')} onClick={onClick} disabled={disabled} title={title} {...rest}>
      {icon}{children}
    </button>
  );
}

function Modal({ open, title, onClose, children, footer, width = 480 }) {
  if (!open) return null;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal fade-in" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
        {title && <div className="modal-head"><h3>{title}</h3></div>}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

function PromptModal({ open, title, label, initialValue = '', placeholder, confirmLabel = 'Save', onSubmit, onClose }) {
  const [value, setValue] = React.useState(initialValue);
  React.useEffect(() => { if (open) setValue(initialValue); }, [open, initialValue]);
  const inputRef = React.useRef(null);
  React.useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);
  if (!open) return null;
  const submit = () => { const v = value.trim(); if (!v) return; onSubmit(v); };
  return (
    <Modal open={open} title={title} onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit} disabled={!value.trim()}>{confirmLabel}</Button>
      </>}>
      {label && <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</label>}
      <input ref={inputRef} className="input" value={value} placeholder={placeholder || ''}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } else if (e.key === 'Escape') { e.preventDefault(); onClose(); } }}/>
    </Modal>
  );
}

function ConfirmModal({ open, title = 'Are you sure?', body, confirmLabel = 'Confirm', danger = true, onConfirm, onClose }) {
  if (!open) return null;
  return (
    <Modal open={open} title={title} onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
      </>}>
      <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>{body}</div>
    </Modal>
  );
}

function Money({ value, className = '', compact = false, decimals = 2, colorSign = false }) {
  let cls = 'num ' + className;
  if (colorSign) cls += value < 0 ? ' neg' : ' pos';
  return <span className={cls}>{window.fmtCurrency(value, { compact, decimals })}</span>;
}

function CatDot({ color }) { return <span className="cat-dot" style={{ background: color }}/>; }

function CategoryPill({ category }) {
  if (!category) return <span className="chip"><CatDot color="#9aa0a6"/> Uncategorised</span>;
  return <span className="chip" style={{ background: 'var(--surface-2)' }}><CatDot color={category.color}/> {category.name}</span>;
}

function Sparkline({ value, max, color = 'var(--accent)' }) {
  const pct = max > 0 ? Math.min(100, value / max * 100) : 0;
  return (
    <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 100, overflow: 'hidden' }}>
      <div style={{ width: pct + '%', height: '100%', background: color, transition: 'width 0.18s ease-out' }}/>
    </div>
  );
}

function StackedBar({ items, height = 10, showLabels = false }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <div>
      <div style={{ display: 'flex', width: '100%', height, borderRadius: height / 2, overflow: 'hidden', background: 'var(--surface-2)' }}>
        {items.map((it, i) => {
          const w = total > 0 ? (it.value / total * 100) : 0;
          return <div key={i} style={{ width: w + '%', background: it.color, transition: 'width 0.18s ease-out' }} title={`${it.label}: ${window.fmtCurrency(it.value)}`}/>;
        })}
      </div>
      {showLabels && (
        <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
          {items.map((it, i) => (
            <span key={i} style={{ fontSize: 12, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CatDot color={it.color}/> {it.label} <span className="num" style={{ color: 'var(--text-strong)', fontWeight: 600 }}>{window.fmtCurrency(it.value, { compact: true })}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- SVG charts ---------------------------------------------------------

// Charts render in real pixel coordinates (viewBox == measured width × height,
// no preserveAspectRatio stretching) so text stays crisp and strokes uniform.

function useMeasuredWidth(fallback = 760) {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(fallback);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setW(Math.max(200, Math.round(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Round a max up to a "nice" axis bound (1/2/5 × 10^n) for readable gridlines.
function niceCeil(v) {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const f = v / base;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * base;
}
function axisTicks(max, n = 4) {
  return Array.from({ length: n + 1 }, (_, i) => (max * i) / n);
}
const CHART_PAD = { l: 58, r: 16, t: 14, b: 30 };

function YAxis({ max, W, y }) {
  return axisTicks(max).map((t, i) => (
    <g key={i}>
      <line x1={CHART_PAD.l} x2={W - CHART_PAD.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1"/>
      <text x={CHART_PAD.l - 8} y={y(t) + 4} fontSize="11" textAnchor="end" fill="var(--text-dim)">
        {window.fmtCurrency(t, { compact: true, decimals: 0 })}
      </text>
    </g>
  ));
}

// Grouped income/expense bar chart by month. data: [{ label, income, expense }]
function BarsChart({ data, height = 240 }) {
  const [ref, W] = useMeasuredWidth();
  const p = CHART_PAD;
  const max = niceCeil(Math.max(1, ...data.map(d => Math.max(d.income, d.expense))));
  const n = data.length || 1;
  const innerW = W - p.l - p.r;
  const innerH = height - p.t - p.b;
  const slot = innerW / n;
  const barW = Math.min(18, Math.max(3, slot * 0.32));
  const y = v => p.t + innerH * (1 - v / max);
  const y0 = y(0);
  const step = Math.ceil(n / 12);
  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} style={{ display: 'block' }}>
        <YAxis max={max} W={W} y={y}/>
        {data.map((d, i) => {
          const cx = p.l + slot * i + slot / 2;
          return (
            <g key={i}>
              <rect x={cx - barW - 1.5} y={y(d.income)} width={barW} height={Math.max(0, y0 - y(d.income))} fill="var(--pos)" rx="2"><title>{`${d.label} · income ${window.fmtCurrency(d.income)}`}</title></rect>
              <rect x={cx + 1.5} y={y(d.expense)} width={barW} height={Math.max(0, y0 - y(d.expense))} fill="var(--neg)" rx="2"><title>{`${d.label} · expense ${window.fmtCurrency(d.expense)}`}</title></rect>
              {i % step === 0 && <text x={cx} y={height - 10} fontSize="11" textAnchor="middle" fill="var(--text-dim)">{d.label}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Multi-series line chart. series: [{ name, color, values:number[] }]; labels: string[]
// `forecastFrom` (index) onward is drawn dashed over a shaded region.
function LineChart({ series, labels, height = 260, forecastFrom = null }) {
  const [ref, W] = useMeasuredWidth();
  const p = CHART_PAD;
  const max = niceCeil(Math.max(1, ...series.flatMap(s => s.values)));
  const len = labels.length || 1;
  const innerW = W - p.l - p.r;
  const innerH = height - p.t - p.b;
  const x = i => p.l + (len <= 1 ? innerW / 2 : (innerW * i) / (len - 1));
  const y = v => p.t + innerH * (1 - v / max);
  const step = Math.max(1, Math.ceil(len / 12));
  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} style={{ display: 'block' }}>
        <YAxis max={max} W={W} y={y}/>
        {forecastFrom != null && forecastFrom < len && (
          <rect x={x(forecastFrom)} y={p.t} width={W - p.r - x(forecastFrom)} height={innerH} fill="var(--surface-2)" opacity="0.7"/>
        )}
        {series.map((s, si) => {
          const solid = [], dashed = [];
          s.values.forEach((v, i) => {
            const pt = `${x(i).toFixed(1)},${y(v).toFixed(1)}`;
            if (forecastFrom == null || i <= forecastFrom) solid.push(pt);
            if (forecastFrom != null && i >= forecastFrom) dashed.push(pt);
          });
          return (
            <g key={si}>
              <polyline points={solid.join(' ')} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
              {dashed.length > 1 && <polyline points={dashed.join(' ')} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray="5 4" opacity="0.9"/>}
            </g>
          );
        })}
        {labels.map((l, i) => (i % step === 0 || i === len - 1) && (
          <text key={i} x={x(i)} y={height - 10} fontSize="11" textAnchor="middle" fill="var(--text-dim)">{window.fmtMonthShort(l)}</text>
        ))}
      </svg>
    </div>
  );
}

function ChartLegend({ items }) {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
      {items.map((it, i) => (
        <span key={i} style={{ fontSize: 12, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <CatDot color={it.color}/> {it.label}
        </span>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, body, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
      <div style={{ color: 'var(--text-dim)', display: 'flex', justifyContent: 'center', marginBottom: 14 }}>{icon}</div>
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>{title}</h2>
      <div style={{ fontSize: 14, maxWidth: 460, margin: '0 auto 18px', lineHeight: 1.55 }}>{body}</div>
      {action}
    </div>
  );
}

Object.assign(window, { Button, Modal, PromptModal, ConfirmModal, Money, CatDot, CategoryPill, Sparkline, StackedBar, BarsChart, LineChart, ChartLegend, EmptyState });
