// import.jsx — The Summoning. Real CSV/OFX/QIF import, four rites.
(function () {
  const { useState, useMemo, useRef } = React;
  const { Button, Icon, Money } = window;
  const D = window.DATA;
  const STEPS = ['Summon', 'Scry', 'Name', 'Sealed'];
  const rid = (p) => p + '-' + Math.random().toString(36).slice(2, 9);

  function Stepper({ step }) {
    return (
      <div className="stepper" style={{ marginBottom: 'var(--s7)' }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={'step' + (i === step ? ' active' : i < step ? ' done' : '')}><span className="bullet">{i < step ? <Icon name="check" size={14} /> : i + 1}</span>{s}</div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--border)', maxWidth: 60 }} />}
          </React.Fragment>
        ))}
      </div>
    );
  }

  function MapField({ label, value, cols, onChange }) {
    return <div className="field"><label>{label}</label><select className="input" value={value || ''} onChange={e => onChange(e.target.value || null)}><option value="">— unbound —</option>{cols.map(c => <option key={c} value={c}>{c}</option>)}</select></div>;
  }

  function Import({ go, app, toast }) {
    const DZ = window.DZ;
    const { state, setState, pushHistory } = app;
    const [step, setStep] = useState(0);
    const [over, setOver] = useState(false);
    const [format, setFormat] = useState('csv');
    const [fileName, setFileName] = useState('');
    const [rawText, setRawText] = useState('');
    const [qifDateFormat, setQifDateFormat] = useState('auto');
    const [prepared, setPrepared] = useState(null);
    const [mapping, setMapping] = useState(null);
    const [rememberName, setRememberName] = useState('');
    const [matched, setMatched] = useState(null);
    const [importId] = useState(() => rid('imp'));
    const fileInput = useRef(null);

    const [fresh, setFresh] = useState([]);
    const [dupes, setDupes] = useState(0);
    const [skipped, setSkipped] = useState(0);
    const [groups, setGroups] = useState([]);
    const [assign, setAssign] = useState({});
    const [patterns, setPatterns] = useState({});

    const handleText = (text, name) => {
      const fmt = DZ.detectFormat(name, text);
      setFormat(fmt); setFileName(name); setRawText(text); setMatched(null); setRememberName('');
      if (fmt === 'csv') {
        const prep = DZ.prepareCsv(text);
        if (!prep.headers.length) { toast('No inscriptions could be read from that scroll'); return; }
        const known = state.importFormats.find(f => f.signature === prep.signature);
        setPrepared(prep); setMatched(known || null);
        setMapping(known ? { ...known.mapping } : DZ.guessMapping(prep.headers));
        setRememberName(known ? known.name : '');
      } else { setPrepared(null); setMapping(null); }
      setStep(1);
    };
    const onFile = (file) => { if (!file) return; const r = new FileReader(); r.onload = () => handleText(String(r.result || ''), file.name); r.readAsText(file); };

    const buildAll = () => format === 'ofx' ? DZ.parseOfx(rawText, importId) : format === 'qif' ? DZ.parseQif(rawText, importId, qifDateFormat) : DZ.buildTransactions(prepared, mapping, importId);
    const mappingValid = format !== 'csv' || (mapping && mapping.date && mapping.description && (mapping.amount || mapping.debit || mapping.credit));

    // Live dedup-merge preview for the Scry step.
    const merge = useMemo(() => {
      if (step !== 1) return { newN: 0, twins: 0, sigils: 0, total: 0 };
      const built = buildAll();
      const ded = DZ.dedupe(state.transactions, built.transactions);
      const cat = DZ.applyRules(ded.fresh, state.rules);
      return { newN: ded.fresh.length, twins: ded.duplicates, sigils: cat.filter(t => t.categoryId).length, total: built.transactions.length };
    }, [step, format, rawText, qifDateFormat, prepared, mapping]);

    const toName = () => {
      const built = buildAll();
      const ded = DZ.dedupe(state.transactions, built.transactions);
      const cat = DZ.applyRules(ded.fresh, state.rules);
      const grps = DZ.groupUnmapped(cat);
      setFresh(cat); setDupes(ded.duplicates); setSkipped(built.skipped); setGroups(grps);
      setPatterns(Object.fromEntries(grps.map(g => [g.pattern, g.pattern]))); setAssign({});
      setStep(2);
    };

    const seal = () => {
      pushHistory();
      const newRules = [];
      for (const g of groups) { const catId = assign[g.pattern]; const pat = (patterns[g.pattern] || g.pattern).trim(); if (catId && pat) newRules.push({ id: rid('r'), pattern: pat.toUpperCase(), categoryId: catId, createdAt: 0 }); }
      setState(s => {
        const rules = [...s.rules, ...newRules];
        // Auto-flag internal transfers (incl. credit-card payments) across vaults.
        const merged = DZ.markTransfers(DZ.applyRules([...s.transactions, ...fresh], rules)).transactions;
        let importFormats = s.importFormats;
        if (format === 'csv' && rememberName.trim() && prepared) { importFormats = importFormats.filter(f => f.signature !== prepared.signature).concat([{ id: rid('fmt'), name: rememberName.trim(), signature: prepared.signature, mapping }]); }
        return { ...s, rules, transactions: merged, importFormats, firstRun: false };
      });
      setStep(3);
    };

    const preview = useMemo(() => { if (step !== 1) return []; const b = buildAll(); return b.transactions.slice(0, 6); }, [step, format, rawText, qifDateFormat, prepared, mapping]);
    const expenseCats = state.categories.filter(c => c.kind !== 'income');

    return (
      <div className="content narrow">
        <div className="page-head"><div><div className="page-title">The Summoning</div><div className="page-meta">What is summoned is bound to thine own; its twins are cast out</div></div></div>
        <Stepper step={step} />

        {step === 0 && (
          <div className="card"><div className="card-body">
            <div className={'dropzone' + (over ? ' over' : '')} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]); }} onClick={() => fileInput.current?.click()}>
              <div className="empty-icon" style={{ margin: '0 auto var(--s4)' }}><Icon name="importIcon" /></div>
              <h3 style={{ marginBottom: 6 }}>Cast a ledger-scroll into the circle</h3>
              <p style={{ margin: '0 auto' }}>CSV, OFX or QIF · its nature is divined for thee</p>
              <div style={{ marginTop: 'var(--s5)' }}><Button variant="primary">Offer a scroll</Button></div>
              <input ref={fileInput} type="file" accept=".csv,.ofx,.qfx,.qif,text/csv,text/plain" style={{ display: 'none' }} onChange={e => onFile(e.target.files?.[0])} />
            </div>
            <div className="row" style={{ gap: 10, marginTop: 'var(--s5)', color: 'var(--text-dim)', fontSize: '0.85rem' }}><Icon name="lock" size={15} />No scroll departs this vessel. Summon the same moon twice without dread — its twins are cast out.</div>
          </div></div>
        )}

        {step === 1 && (
          <div className="card"><div className="card-body">
            <div style={{ fontWeight: 700, color: 'var(--text-strong)', marginBottom: 4 }}>{fileName}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 'var(--s5)' }}>{format.toUpperCase()} divined · {merge.total} inscriptions{matched ? ` · the rite of “${matched.name}”` : ''}</div>

            {format === 'csv' && mapping ? (
              <>
                <div className="grid grid-2" style={{ gap: 'var(--s4)' }}>
                  <MapField label="Day" value={mapping.date} cols={prepared.headers} onChange={v => setMapping(m => ({ ...m, date: v }))} />
                  <MapField label="Inscription" value={mapping.description} cols={prepared.headers} onChange={v => setMapping(m => ({ ...m, description: v }))} />
                  <MapField label="Sum (signed)" value={mapping.amount} cols={prepared.headers} onChange={v => setMapping(m => ({ ...m, amount: v, debit: null, credit: null }))} />
                  <div className="grid grid-2" style={{ gap: 10 }}>
                    <MapField label="Spent" value={mapping.debit} cols={prepared.headers} onChange={v => setMapping(m => ({ ...m, debit: v, amount: null }))} />
                    <MapField label="Gained" value={mapping.credit} cols={prepared.headers} onChange={v => setMapping(m => ({ ...m, credit: v, amount: null }))} />
                  </div>
                  <MapField label="Vault (optional)" value={mapping.account} cols={prepared.headers} onChange={v => setMapping(m => ({ ...m, account: v }))} />
                  <div className="field"><label>Reckoning of days</label><select className="input" value={mapping.dateFormat} onChange={e => setMapping(m => ({ ...m, dateFormat: e.target.value }))}><option value="auto">Divine it</option><option value="DMY">Day / Month / Year</option><option value="MDY">Month / Day / Year</option><option value="YMD">Year / Month / Day</option></select></div>
                </div>
                {mapping.amount && <label className="row" style={{ gap: 8, marginTop: 'var(--s4)', fontSize: '0.9rem', color: 'var(--text-muted)' }}><input type="checkbox" checked={mapping.flipSign} onChange={e => setMapping(m => ({ ...m, flipSign: e.target.checked }))} />Invert the sign (if spending shows as gain)</label>}
                <div className="row" style={{ gap: 12, marginTop: 'var(--s4)' }}><label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Remember this rite as</label><input className="input" style={{ maxWidth: 220 }} value={rememberName} onChange={e => setRememberName(e.target.value)} placeholder="name (optional)" /></div>
              </>
            ) : (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {format === 'ofx' ? 'The OFX scroll names its own fields — date, sum, payee, and a unique mark for casting out twins. Naught to bind.' : 'The QIF scroll names its fields. Should the days read amiss below, choose their reckoning.'}
                {format === 'qif' && <div className="field" style={{ maxWidth: 240, marginTop: 'var(--s4)' }}><label>Reckoning of days</label><select className="input" value={qifDateFormat} onChange={e => setQifDateFormat(e.target.value)}><option value="auto">Divine it</option><option value="DMY">Day / Month / Year</option><option value="MDY">Month / Day / Year</option><option value="YMD">Year / Month / Day</option></select></div>}
              </div>
            )}

            {preview.length > 0 && (
              <table className="table" style={{ marginTop: 'var(--s5)', fontSize: '0.86rem' }}><thead><tr><th>Day</th><th>Inscription</th><th className="num">Sum</th></tr></thead><tbody>{preview.map(t => <tr key={t.id}><td className="num">{t.date}</td><td>{t.description}</td><td className="num" style={{ color: t.amount > 0 ? 'var(--pos)' : 'var(--text-strong)' }}>{window.fmtCurrency(t.amount, { sign: t.amount > 0 })}</td></tr>)}</tbody></table>
            )}

            <hr className="divider" />
            <div className="grid grid-3" style={{ gap: 'var(--s4)' }}>
              <div className="stat" style={{ borderColor: 'color-mix(in srgb, var(--pos) 30%, var(--border))' }}><div className="stat-label" style={{ color: 'var(--pos)' }}><Icon name="plus" size={15} />New</div><div className="stat-value sm num">{merge.newN}</div></div>
              <div className="stat"><div className="stat-label"><Icon name="refresh" size={15} />Twins cast out</div><div className="stat-value sm num">{merge.twins}</div></div>
              <div className="stat"><div className="stat-label"><Icon name="check" size={15} />Sigils bestowed</div><div className="stat-value sm num">{merge.sigils}</div></div>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}><Button variant="ghost" onClick={() => setStep(0)}>Back</Button><Button variant="primary" disabled={!mappingValid || merge.total === 0} onClick={toName}>Onward<Icon name="chevronRight" size={16} /></Button></div>
          </div></div>
        )}

        {step === 2 && (
          <div className="card"><div className="card-body">
            <div style={{ fontWeight: 700, color: 'var(--text-strong)', marginBottom: 'var(--s4)' }}>{groups.length === 0 ? 'Every name already bears a sigil' : `${groups.length} names yet lack a sigil`}</div>
            {groups.length > 0 && (
              <table className="table"><thead><tr><th>Name</th><th className="num">Seen</th><th className="num">Sum</th><th>Pattern</th><th style={{ width: 170 }}>Sigil</th></tr></thead><tbody>
                {groups.map(g => (
                  <tr key={g.pattern}>
                    <td style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{g.merchant}<div className="desc-raw">{g.sampleRaw}</div></td>
                    <td className="num" style={{ color: 'var(--text-muted)' }}>{g.count}</td>
                    <td className="num">{window.fmtCurrency(g.total)}</td>
                    <td><input className="input" style={{ fontSize: '0.82rem', padding: '4px 8px', minWidth: 120 }} value={patterns[g.pattern] ?? g.pattern} onChange={e => setPatterns(p => ({ ...p, [g.pattern]: e.target.value }))} /></td>
                    <td><select className="input" value={assign[g.pattern] || ''} onChange={e => setAssign(a => ({ ...a, [g.pattern]: e.target.value }))}><option value="">+ Bestow…</option>{state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
                  </tr>
                ))}
              </tbody></table>
            )}
            <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}><Button variant="ghost" onClick={() => setStep(1)}>Back</Button><Button variant="primary" onClick={seal}>Seal the rite</Button></div>
          </div></div>
        )}

        {step === 3 && (
          <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 'var(--s9) var(--s6)' }}>
            <div className="empty-icon" style={{ margin: '0 auto var(--s4)', background: 'color-mix(in srgb, var(--pos) 18%, transparent)', color: 'var(--pos)' }}><Icon name="check" /></div>
            <h3 style={{ fontSize: '1.4rem' }}><span className="num">{fresh.length}</span> inscriptions bound to the ledger</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: 380, margin: '8px auto var(--s5)' }}>{dupes > 0 ? `${dupes} twins were cast out. ` : ''}{skipped > 0 ? `${skipped} could not be read. ` : ''}Thy sanctum and sigils are reckoned anew.</p>
            <Button variant="primary" onClick={() => go('dashboard')}>Return to the sanctum</Button>
          </div></div>
        )}
      </div>
    );
  }
  window.Import = Import;
})();
