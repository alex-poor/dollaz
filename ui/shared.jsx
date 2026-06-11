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

// Grouped income/expense/net bar chart by month.
// data: [{ label, income, expense, net }]
function BarsChart({ data, height = 220 }) {
  const pad = { l: 8, r: 8, t: 12, b: 26 };
  const W = 100; // viewBox width units; rendered responsive
  const max = Math.max(1, ...data.map(d => Math.max(d.income, d.expense)));
  const n = data.length || 1;
  const slot = (W - pad.l - pad.r) / n;
  const barW = Math.min(14, slot * 0.34);
  const innerH = height - pad.t - pad.b;
  const y = v => pad.t + innerH * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      {[0.25, 0.5, 0.75, 1].map((f, i) => (
        <line key={i} x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="var(--border)" strokeWidth="0.3"/>
      ))}
      {data.map((d, i) => {
        const cx = pad.l + slot * i + slot / 2;
        return (
          <g key={i}>
            <rect x={cx - barW - 1} y={y(d.income)} width={barW} height={Math.max(0, pad.t + innerH - y(d.income))} fill="var(--pos)" rx="1">
              <title>{`${d.label} · income ${window.fmtCurrency(d.income)}`}</title>
            </rect>
            <rect x={cx + 1} y={y(d.expense)} width={barW} height={Math.max(0, pad.t + innerH - y(d.expense))} fill="var(--neg)" rx="1">
              <title>{`${d.label} · expense ${window.fmtCurrency(d.expense)}`}</title>
            </rect>
            {n <= 18 && <text x={cx} y={height - 8} fontSize="3.4" textAnchor="middle" fill="var(--text-dim)">{d.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// Multi-series line chart. series: [{ name, color, values:number[] }]; labels: string[]
// `forecastFrom` (index) onward is drawn dashed.
function LineChart({ series, labels, height = 240, forecastFrom = null }) {
  const pad = { l: 8, r: 6, t: 10, b: 24 };
  const W = 100;
  const allVals = series.flatMap(s => s.values);
  const max = Math.max(1, ...allVals);
  const len = labels.length || 1;
  const innerW = W - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const x = i => pad.l + (len <= 1 ? innerW / 2 : innerW * i / (len - 1));
  const y = v => pad.t + innerH * (1 - v / max);
  const labelStep = Math.ceil(len / 8);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      {[0, 0.5, 1].map((f, i) => (
        <line key={i} x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="var(--border)" strokeWidth="0.3"/>
      ))}
      {forecastFrom != null && forecastFrom < len && (
        <rect x={x(forecastFrom)} y={pad.t} width={W - pad.r - x(forecastFrom)} height={innerH} fill="var(--surface-2)" opacity="0.6"/>
      )}
      {series.map((s, si) => {
        const solid = []; const dashed = [];
        s.values.forEach((v, i) => {
          const pt = `${x(i).toFixed(2)},${y(v).toFixed(2)}`;
          if (forecastFrom == null || i <= forecastFrom) solid.push(pt);
          if (forecastFrom != null && i >= forecastFrom) dashed.push(pt);
        });
        return (
          <g key={si}>
            <polyline points={solid.join(' ')} fill="none" stroke={s.color} strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round"/>
            {dashed.length > 1 && <polyline points={dashed.join(' ')} fill="none" stroke={s.color} strokeWidth="0.8" strokeDasharray="1.5 1.5" opacity="0.85"/>}
          </g>
        );
      })}
      {labels.map((l, i) => (i % labelStep === 0 || i === len - 1) && (
        <text key={i} x={x(i)} y={height - 7} fontSize="3.2" textAnchor="middle" fill="var(--text-dim)">{window.fmtMonthShort(l)}</text>
      ))}
    </svg>
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
