// import.jsx — Import CSV: drop → map columns → categorise unmapped → commit.
const { ICONS, Button, Money, CatDot, PromptModal } = window;

function newId(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 9); }

function ImportScreen({ state, setState, pushHistory, pushToast }) {
  const DZ = window.DZ;
  const [stage, setStage] = React.useState('drop');     // drop | map | categorize | done
  const [fileName, setFileName] = React.useState('');
  const [prepared, setPrepared] = React.useState(null);
  const [mapping, setMapping] = React.useState(null);
  const [importId] = React.useState(() => newId('imp'));
  const [dragHover, setDragHover] = React.useState(false);
  const [rememberName, setRememberName] = React.useState('');
  const [matchedFormat, setMatchedFormat] = React.useState(null);

  // Results of the build (computed when leaving the map stage).
  const [fresh, setFresh] = React.useState([]);
  const [dupes, setDupes] = React.useState(0);
  const [skipped, setSkipped] = React.useState(0);
  const [groups, setGroups] = React.useState([]);       // unmapped groups
  const [assign, setAssign] = React.useState({});       // groupPattern -> categoryId
  const [patterns, setPatterns] = React.useState({});   // groupPattern -> editable pattern
  const [newCatFor, setNewCatFor] = React.useState(null);

  const fileInput = React.useRef(null);

  const handleText = (text, name) => {
    const prep = DZ.prepareCsv(text);
    if (!prep.headers.length) { pushToast({ msg: 'Could not read any rows from that file' }); return; }
    const known = state.importFormats.find(f => f.signature === prep.signature);
    setPrepared(prep);
    setFileName(name);
    setMatchedFormat(known || null);
    setMapping(known ? { ...known.mapping } : DZ.guessMapping(prep.headers));
    setRememberName(known ? known.name : '');
    setStage('map');
    if (known) pushToast({ msg: `Recognised layout “${known.name}” — mapping applied` });
  };

  const onFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleText(String(reader.result || ''), file.name);
    reader.readAsText(file);
  };
  const onDrop = (e) => { e.preventDefault(); setDragHover(false); onFile(e.dataTransfer.files?.[0]); };

  const mappingValid = mapping && mapping.date && mapping.description && (mapping.amount || mapping.debit || mapping.credit);

  // Preview the first few rows under the current mapping.
  const preview = React.useMemo(() => {
    if (!prepared || !mapping) return { transactions: [], skipped: 0 };
    const sample = { ...prepared, rows: prepared.rows.slice(0, 6) };
    return DZ.buildTransactions(sample, mapping, importId);
  }, [prepared, mapping, importId]);

  const proceedToCategorize = () => {
    const built = DZ.buildTransactions(prepared, mapping, importId);
    const ded = DZ.dedupe(state.transactions, built.transactions);
    const categorised = DZ.applyRules(ded.fresh, state.rules);
    const grps = DZ.groupUnmapped(categorised);
    setFresh(categorised);
    setDupes(ded.duplicates);
    setSkipped(built.skipped);
    setGroups(grps);
    setPatterns(Object.fromEntries(grps.map(g => [g.pattern, g.pattern])));
    setAssign({});
    setStage('categorize');
  };

  const createCategory = (name) => {
    const cat = { id: newId('c'), name, kind: 'expense', color: pickColor(state.categories.length) };
    setState(s => ({ ...s, categories: [...s.categories, cat] }));
    return cat.id;
  };

  const commit = () => {
    pushHistory();
    // Build the new rules from group assignments, then re-apply across the whole
    // (existing + fresh) set so historical uncategorised rows benefit too.
    const newRules = [];
    for (const g of groups) {
      const catId = assign[g.pattern];
      const pat = (patterns[g.pattern] || g.pattern).trim();
      if (!catId || !pat) continue;
      newRules.push({ id: newId('r'), pattern: pat.toUpperCase(), categoryId: catId, createdAt: 0 });
    }
    setState(s => {
      const rules = [...s.rules, ...newRules];
      const merged = DZ.applyRules([...s.transactions, ...fresh], rules);
      let importFormats = s.importFormats;
      if (rememberName.trim()) {
        importFormats = importFormats.filter(f => f.signature !== prepared.signature);
        importFormats = [...importFormats, { id: newId('fmt'), name: rememberName.trim(), signature: prepared.signature, mapping }];
      }
      return { ...s, rules, transactions: merged, importFormats, firstRun: false };
    });
    pushToast({ msg: `Imported ${fresh.length} transactions${dupes ? `, skipped ${dupes} duplicates` : ''}` });
    setStage('done');
  };

  const reset = () => { setStage('drop'); setPrepared(null); setMapping(null); setFresh([]); setGroups([]); setAssign({}); setFileName(''); };

  const mappedCount = groups.filter(g => assign[g.pattern]).length;

  return (
    <div className="content narrow">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Import transactions</h1>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
        Drop a bank CSV. Columns are mapped (and remembered per layout), duplicates are skipped, and unmapped merchants are surfaced for one-time categorisation.
      </div>

      <Stepper stage={stage}/>

      {stage === 'drop' && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-body">
            <div className={'dropzone' + (dragHover ? ' hover' : '')}
              onDragOver={e => { e.preventDefault(); setDragHover(true); }}
              onDragLeave={() => setDragHover(false)}
              onDrop={onDrop}
              onClick={() => fileInput.current?.click()}>
              <div style={{ color: 'var(--accent)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}><ICONS.Upload size={32}/></div>
              <div style={{ fontWeight: 600, color: 'var(--text-strong)', marginBottom: 4 }}>
                Drop a CSV here <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>or click to choose</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Any bank export with a date, description and amount (or debit/credit) column.</div>
              <input ref={fileInput} type="file" accept=".csv,text/csv,text/plain" style={{ display: 'none' }}
                onChange={e => onFile(e.target.files?.[0])}/>
            </div>
            {state.importFormats.length > 0 && (
              <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>
                Saved layouts: {state.importFormats.map(f => f.name).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {stage === 'map' && mapping && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head">
            <h3>Map columns</h3>
            <span className="sub">{fileName} · {prepared.rows.length} rows{matchedFormat ? ` · matched “${matchedFormat.name}”` : ''}</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <MapField label="Date column *" value={mapping.date} cols={prepared.headers} onChange={v => setMapping(m => ({ ...m, date: v }))}/>
              <MapField label="Description column *" value={mapping.description} cols={prepared.headers} onChange={v => setMapping(m => ({ ...m, description: v }))}/>
              <MapField label="Amount (single signed column)" value={mapping.amount} cols={prepared.headers} onChange={v => setMapping(m => ({ ...m, amount: v, debit: null, credit: null }))}/>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <MapField label="Debit / out" value={mapping.debit} cols={prepared.headers} onChange={v => setMapping(m => ({ ...m, debit: v, amount: null }))}/>
                <MapField label="Credit / in" value={mapping.credit} cols={prepared.headers} onChange={v => setMapping(m => ({ ...m, credit: v, amount: null }))}/>
              </div>
              <MapField label="Account (optional)" value={mapping.account} cols={prepared.headers} onChange={v => setMapping(m => ({ ...m, account: v }))}/>
              <div className="field">
                <label>Date format</label>
                <select className="input" value={mapping.dateFormat} onChange={e => setMapping(m => ({ ...m, dateFormat: e.target.value }))}>
                  <option value="auto">Auto-detect</option>
                  <option value="DMY">Day / Month / Year</option>
                  <option value="MDY">Month / Day / Year</option>
                  <option value="YMD">Year / Month / Day</option>
                </select>
              </div>
            </div>

            {mapping.amount && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>
                <input type="checkbox" checked={mapping.flipSign} onChange={e => setMapping(m => ({ ...m, flipSign: e.target.checked }))}/>
                Flip sign (use if spending shows as positive numbers)
              </label>
            )}

            <div className="divider"/>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 8 }}>Preview {preview.transactions.length ? `(${preview.transactions.length} of first rows)` : ''}</div>
            {preview.transactions.length === 0 ? (
              <div className="hint error">No rows parsed — check the date and amount columns and date format.</div>
            ) : (
              <table className="table" style={{ fontSize: 12.5 }}>
                <thead><tr><th>Date</th><th>Description</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {preview.transactions.map(t => (
                    <tr key={t.id}><td className="num">{t.date}</td><td>{t.description}</td><td className="num"><Money value={t.amount} colorSign/></td></tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <label style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Remember as</label>
              <input className="input" style={{ width: 220 }} placeholder="layout name (optional)" value={rememberName} onChange={e => setRememberName(e.target.value)}/>
              <div style={{ flex: 1 }}/>
              <Button variant="ghost" onClick={reset}>Back</Button>
              <Button variant="primary" disabled={!mappingValid} onClick={proceedToCategorize}>Continue →</Button>
            </div>
          </div>
        </div>
      )}

      {stage === 'categorize' && (
        <div style={{ marginTop: 18 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <SummaryNum n={fresh.length} label="new transactions"/>
              <SummaryNum n={dupes} label="duplicates skipped"/>
              {skipped > 0 && <SummaryNum n={skipped} label="unparseable rows"/>}
              <SummaryNum n={groups.length} label="merchants to map"/>
              <div style={{ flex: 1 }}/>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{mappedCount} / {groups.length} mapped</div>
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="card"><div className="card-body" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ color: 'var(--pos)', marginBottom: 8, display: 'flex', justifyContent: 'center' }}><ICONS.Check size={28}/></div>
              Everything matched your existing rules. Nothing left to map.
            </div></div>
          ) : (
            <div className="card">
              <div className="card-head"><h3>Map merchants to categories</h3><span className="sub">creates a rule — applied to this and future imports</span></div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="table">
                  <thead><tr><th>Merchant</th><th className="num">Txns</th><th className="num">Total</th><th>Rule pattern</th><th>Category</th></tr></thead>
                  <tbody>
                    {groups.map(g => (
                      <tr key={g.pattern}>
                        <td><div style={{ fontWeight: 500 }}>{g.merchant}</div><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{g.sampleRaw}</div></td>
                        <td className="num">{g.count}</td>
                        <td className="num"><Money value={g.total} colorSign/></td>
                        <td>
                          <input className="input" style={{ fontSize: 12.5, padding: '4px 8px', minWidth: 140 }}
                            value={patterns[g.pattern] ?? g.pattern}
                            onChange={e => setPatterns(p => ({ ...p, [g.pattern]: e.target.value }))}/>
                        </td>
                        <td>
                          <select className="input" style={{ fontSize: 12.5, padding: '4px 8px', minWidth: 150 }}
                            value={assign[g.pattern] || ''}
                            onChange={e => {
                              if (e.target.value === '__new__') { setNewCatFor(g.pattern); return; }
                              setAssign(a => ({ ...a, [g.pattern]: e.target.value }));
                            }}>
                            <option value="">— skip —</option>
                            {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            <option value="__new__">+ New category…</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setStage('map')}>Back</Button>
            <Button variant="primary" icon={<ICONS.Check/>} onClick={commit}>Commit import</Button>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-body" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ color: 'var(--pos)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}><ICONS.Check size={32}/></div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-strong)' }}>Import complete</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 6, marginBottom: 18 }}>
              {fresh.length} transactions added{dupes ? `, ${dupes} duplicates skipped` : ''}.
            </div>
            <Button variant="primary" onClick={reset} icon={<ICONS.Import/>}>Import another</Button>
          </div>
        </div>
      )}

      <PromptModal open={!!newCatFor} title="New category" label="Category name" placeholder="e.g. Pets"
        onClose={() => setNewCatFor(null)}
        onSubmit={(name) => { const id = createCategory(name); setAssign(a => ({ ...a, [newCatFor]: id })); setNewCatFor(null); }}/>
    </div>
  );
}

function MapField({ label, value, cols, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select className="input" value={value || ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">— not mapped —</option>
        {cols.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}

function SummaryNum({ n, label }) {
  return (
    <div>
      <div className="num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-strong)' }}>{window.fmtNumber(n)}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function Stepper({ stage }) {
  const steps = [{ k: 'drop', label: 'Upload' }, { k: 'map', label: 'Map columns' }, { k: 'categorize', label: 'Categorise' }, { k: 'done', label: 'Done' }];
  const curr = steps.findIndex(s => s.k === stage);
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <React.Fragment key={s.k}>
          <div className="step" style={{ color: i <= curr ? 'var(--accent)' : 'var(--text-dim)' }}>
            <span className="bullet" style={{ background: i <= curr ? 'var(--accent)' : 'var(--surface-2)', color: i <= curr ? 'white' : 'var(--text-dim)' }}>{i < curr ? '✓' : i + 1}</span>
            {s.label}
          </div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--border)', maxWidth: 60 }}/>}
        </React.Fragment>
      ))}
    </div>
  );
}

const PALETTE = ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#6366f1'];
function pickColor(i) { return PALETTE[i % PALETTE.length]; }

window.ImportScreen = ImportScreen;
