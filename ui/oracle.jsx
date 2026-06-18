// oracle.jsx — The Oracle. An in-app chat that answers questions about the
// seeker's coin by letting Claude call read-only, aggregate-only rites (tools)
// over the live ledger (defined in ../src/ai.ts → window.DZ). The agentic loop
// lives here; the model and its tools never see raw transactions.
//
// Transport: a direct streaming fetch to the Anthropic Messages API from the
// webview (anthropic-dangerous-direct-browser-access). The API key is held in
// localStorage via window.dzAI — deliberately OUTSIDE app state, so it never
// enters undo snapshots, disk backups, or the CSV export.
(function () {
  const { useState, useRef, useEffect, useCallback } = React;
  const { Icon, Button, EmptyState } = window;

  /* ---------- key store + transport (window.dzAI) ---------- */
  const KEY_LS = 'dollaz:anthropic-key';
  const dzAI = {
    getKey() { try { return localStorage.getItem(KEY_LS) || ''; } catch { return ''; } },
    setKey(v) { try { v ? localStorage.setItem(KEY_LS, v.trim()) : localStorage.removeItem(KEY_LS); } catch {} },
    hasKey() { return !!dzAI.getKey(); },
  };

  // One Messages-API call (non-streaming). WebKitGTK does not reliably deliver
  // streamed ReadableStream response bodies, so we request the whole message and
  // parse it directly — the JSON response IS the assembled message
  // ({ content, stop_reason, usage, model }).
  dzAI.send = async function send(body, key, { signal } = {}) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal,
    });
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const msg = (data && data.error && data.error.message) || ('HTTP ' + res.status);
      const err = new Error(msg); err.status = res.status; throw err;
    }
    return data || { content: [], stop_reason: null };
  };

  window.dzAI = dzAI;

  /* ---------- arcane labels + error voice ---------- */
  const TOOL_LABEL = {
    overview: 'reckoning the whole ledger',
    monthly_trend: 'tracing the moons',
    category_breakdown: 'weighing the sigils',
    category_trend: 'following a sigil through time',
    merchant_spend: 'searching the Bazaar',
    forecast: 'casting the prophecy',
  };
  function friendlyErr(e) {
    if (e && e.status === 401) return 'The Oracle refuses thy key. Inscribe a valid Anthropic key in Rites & Bindings.';
    if (e && e.status === 429) return 'The Oracle is beset by petitioners (rate limit). Wait a breath and ask again.';
    if (e && e.status === 529) return 'The Oracle is overwhelmed. Try once more shortly.';
    return 'The scrying faltered: ' + String((e && e.message) || e);
  }

  /* ---------- key onboarding (also reused in Settings) ---------- */
  function KeyForm({ onSaved, compact }) {
    const [draft, setDraft] = useState('');
    const save = () => { if (draft.trim()) { dzAI.setKey(draft); setDraft(''); onSaved && onSaved(); } };
    return (
      <div className="grid" style={{ gap: 'var(--s3)' }}>
        <div className="field">
          <label>Anthropic key</label>
          <input className="input" type="password" placeholder="sk-ant-…" value={draft} autoComplete="off" spellCheck={false}
            onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
        </div>
        <Button variant="primary" iconName="eye" onClick={save}>{compact ? 'Bind the key' : 'Wake the Oracle'}</Button>
      </div>
    );
  }

  /* ---------- minimal, safe markdown → React (no innerHTML) ---------- */
  const h = React.createElement;
  function mdInline(text, k0) {
    const out = []; let last = 0, k = (k0 || 0) * 1000;
    const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*\n]+)\*|_([^_\n]+)_)/g;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      if (m[2] != null) out.push(h('strong', { key: k++ }, m[2]));
      else if (m[3] != null) out.push(h('code', { key: k++, className: 'oracle-code' }, m[3]));
      else out.push(h('em', { key: k++ }, m[4] != null ? m[4] : m[5]));
      last = re.lastIndex;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }
  const mdCells = (line) => { let s = line.trim(); if (s.startsWith('|')) s = s.slice(1); if (s.endsWith('|')) s = s.slice(0, -1); return s.split('|').map(c => c.trim()); };
  function MD({ text }) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const isUL = (l) => /^\s*[-*]\s+/.test(l), isOL = (l) => /^\s*\d+\.\s+/.test(l), isH = (l) => /^#{1,4}\s/.test(l);
    const blocks = []; let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1])) {
        const header = mdCells(line); i += 2; const rows = [];
        while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { rows.push(mdCells(lines[i])); i++; }
        blocks.push({ t: 'table', header, rows }); continue;
      }
      const hm = line.match(/^#{1,4}\s+(.*)$/);
      if (hm) { blocks.push({ t: 'h', text: hm[1] }); i++; continue; }
      if (isUL(line)) { const items = []; while (i < lines.length && isUL(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++; } blocks.push({ t: 'ul', items }); continue; }
      if (isOL(line)) { const items = []; while (i < lines.length && isOL(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; } blocks.push({ t: 'ol', items }); continue; }
      const para = [line]; i++;
      while (i < lines.length && lines[i].trim() && !isUL(lines[i]) && !isOL(lines[i]) && !isH(lines[i]) && !lines[i].includes('|')) { para.push(lines[i]); i++; }
      blocks.push({ t: 'p', lines: para });
    }
    return blocks.map((b, bi) => {
      if (b.t === 'h') return h('div', { key: bi, className: 'oracle-h' }, mdInline(b.text, bi));
      if (b.t === 'ul' || b.t === 'ol') return h(b.t === 'ul' ? 'ul' : 'ol', { key: bi, className: 'oracle-list' }, b.items.map((it, j) => h('li', { key: j }, mdInline(it, j))));
      if (b.t === 'table') return h('div', { key: bi, className: 'oracle-table-wrap' }, h('table', { className: 'oracle-md-table' },
        h('thead', null, h('tr', null, b.header.map((c, j) => h('th', { key: j }, mdInline(c, j))))),
        h('tbody', null, b.rows.map((r, ri) => h('tr', { key: ri }, r.map((c, j) => h('td', { key: j }, mdInline(c, ri * 100 + j))))))));
      const kids = [];
      b.lines.forEach((p, j) => { if (j) kids.push(h('br', { key: 'br' + j })); mdInline(p, j).forEach(n => kids.push(n)); });
      return h('p', { key: bi, className: 'oracle-p' }, kids);
    });
  }

  /* ---------- a single message bubble ---------- */
  function Turn({ turn }) {
    if (turn.role === 'user') return <div className="oracle-row me"><div className="oracle-bubble me">{turn.text}</div></div>;
    if (turn.role === 'error') return <div className="oracle-row"><div className="oracle-note err"><Icon name="alert" size={14} />{turn.text}</div></div>;
    // oracle
    return (
      <div className="oracle-row">
        <div className="oracle-bubble">
          {turn.text ? <div className="oracle-text"><MD text={turn.text} /></div> : <div className="oracle-text dim"><span className="oracle-cursor">▌</span></div>}
          {turn.tools && turn.tools.length > 0 && (
            <div className="oracle-tools">{turn.tools.map((tl, i) => <span key={i} className="oracle-tool"><Icon name="eye" size={12} />{tl}</span>)}</div>
          )}
        </div>
      </div>
    );
  }

  const SUGGESTIONS = [
    'How fares my coin overall?',
    'Where does most of my spending go?',
    'How much have I paid Countdown?',
    'Does a deficit loom in the coming moons?',
  ];

  function Oracle({ go, app }) {
    const D = window.DATA;
    const model = (app.state.settings.ai && app.state.settings.ai.model) || 'claude-opus-4-8';
    const [hasKey, setHasKey] = useState(dzAI.hasKey());
    const [turns, setTurns] = useState([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const apiMsgs = useRef([]);
    const abortRef = useRef(null);
    const bodyRef = useRef(null);

    useEffect(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight; }, [turns]);

    const buildCtx = useCallback(() => ({
      transactions: app.state.transactions,
      categories: app.state.categories,
      accounts: app.state.accounts,
      rules: app.state.rules,
      currency: app.state.settings.currency || '$',
    }), [app.state]);

    const ask = useCallback(async (text) => {
      if (!text.trim() || busy) return;
      setInput('');
      setTurns(ts => [...ts, { role: 'user', text }]);
      apiMsgs.current.push({ role: 'user', content: text });
      setBusy(true);

      const ctx = buildCtx();
      const ac = new AbortController(); abortRef.current = ac;
      let oracleIdx = -1;
      setTurns(ts => { oracleIdx = ts.length; return [...ts, { role: 'oracle', text: '', tools: [] }]; });
      const patch = (fn) => setTurns(ts => ts.map((t, i) => (i === oracleIdx ? fn(t) : t)));
      const addText = (s) => { if (s) patch(t => ({ ...t, text: t.text ? t.text + '\n\n' + s : s })); };
      const noteTool = (label) => patch(t => ({ ...t, tools: [...(t.tools || []), label] }));

      try {
        const system = window.DZ.aiSystemPrompt({ currency: ctx.currency, today: new Date().toISOString().slice(0, 10) });
        for (let hop = 0; hop < 8; hop++) {
          const body = { model, max_tokens: 4096, system, tools: window.DZ.AI_TOOLS, messages: apiMsgs.current };
          const final = await dzAI.send(body, dzAI.getKey(), { signal: ac.signal });
          const blocks = final.content || [];
          addText(blocks.filter(b => b.type === 'text').map(b => b.text).join('').trim());
          // keep tool_use blocks; drop empty text blocks (the API rejects them)
          const asst = blocks.filter(b => !(b.type === 'text' && !b.text.trim()));
          apiMsgs.current.push({ role: 'assistant', content: asst.length ? asst : blocks });
          if (final.stop_reason === 'refusal') { addText('— the Oracle declined this question —'); break; }
          if (final.stop_reason !== 'tool_use') break;
          const results = [];
          for (const b of blocks) {
            if (b.type !== 'tool_use') continue;
            noteTool(TOOL_LABEL[b.name] || b.name);
            let out;
            try { out = window.DZ.runAiTool(b.name, b.input, ctx); }
            catch (e) { out = { error: String((e && e.message) || e) }; }
            results.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(out), is_error: !!(out && out.error) });
          }
          apiMsgs.current.push({ role: 'user', content: results });
        }
      } catch (e) {
        if (e && e.name === 'AbortError') patch(t => ({ ...t, text: t.text + (t.text ? '\n\n' : '') + '— the rite was stayed —' }));
        else setTurns(ts => [...ts, { role: 'error', text: friendlyErr(e) }]);
      } finally {
        setBusy(false); abortRef.current = null;
        // never leave a bare pulsing cursor if nothing came back
        setTurns(ts => ts.map((t, i) => (i === oracleIdx && t.role === 'oracle' && !t.text ? { ...t, text: '…no vision formed. Ask again.' } : t)));
      }
    }, [busy, model, buildCtx]);

    const stop = () => { if (abortRef.current) abortRef.current.abort(); };
    const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } };

    if (!D.hasData) {
      return <div className="content"><EmptyState iconName="eye" title="The Oracle waits in darkness" action={<Button variant="primary" iconName="importIcon" onClick={() => go('import')}>Summon records</Button>}>The Oracle reads only what thy ledger holds. Summon thy records first, and it shall wake to thy questions.</EmptyState></div>;
    }

    if (!hasKey) {
      return (
        <div className="content">
          <div className="page-head"><div><div className="page-title">The Oracle</div><div className="page-meta">A familiar that reads thy ledger and answers</div></div></div>
          <div className="card" style={{ maxWidth: 560, padding: 'var(--s6)' }}>
            <div className="row" style={{ gap: 'var(--s3)', alignItems: 'center', marginBottom: 'var(--s4)' }}>
              <span style={{ color: 'var(--gold-bright)' }}><Icon name="eye" size={28} /></span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-strong)' }}>Wake the Oracle</div>
            </div>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 var(--s4)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              To commune, inscribe an <strong>Anthropic API key</strong> (begins <span className="num">sk-ant-</span>). Forge one at <span className="num" style={{ color: 'var(--gold-bright)' }}>console.anthropic.com</span> — a Claude.ai subscription cannot serve here; the key is its own coin, paid by the measure of what thou askest.
            </p>
            <KeyForm onSaved={() => setHasKey(true)} />
            <div className="oracle-note" style={{ marginTop: 'var(--s4)' }}>
              <Icon name="lock" size={14} />
              To answer, the Oracle sends what it must to Anthropic — sums and tallies, and, when a question demands, individual inscriptions (their dates, amounts, merchants). Naught else leaves; the key is bound to this device alone.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="content oracle-screen">
        <div className="page-head">
          <div><div className="page-title">The Oracle</div><div className="page-meta">Speaks only from thy ledger · <span className="num">{model}</span></div></div>
          {turns.length > 0 && <button className="btn ghost sm" onClick={() => { setTurns([]); apiMsgs.current = []; }}><Icon name="trash" size={14} />Clear the scrying</button>}
        </div>

        <div className="oracle-body" ref={bodyRef}>
          {turns.length === 0 ? (
            <div className="oracle-welcome">
              <span style={{ color: 'var(--gold-dim)' }}><Icon name="eye" size={40} /></span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--text-strong)', margin: '10px 0 4px' }}>Pose thy question</div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: 'var(--s5)' }}>The Oracle gazes into thy ledger and answers in coin and counsel.</div>
              <div className="oracle-sugg">{SUGGESTIONS.map((s, i) => <button key={i} className="chip" onClick={() => ask(s)}>{s}</button>)}</div>
            </div>
          ) : turns.map((t, i) => <Turn key={i} turn={t} />)}
        </div>

        <div className="oracle-compose">
          <textarea className="input oracle-input" rows={1} placeholder="Ask the Oracle of thy coin…" value={input}
            onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} disabled={busy} />
          {busy
            ? <button className="btn" onClick={stop} title="Stay the rite"><Icon name="x" size={16} />Stay</button>
            : <button className="btn primary" onClick={() => ask(input)} disabled={!input.trim()} title="Ask"><Icon name="send" size={16} /></button>}
        </div>
        <div className="oracle-foot"><Icon name="lock" size={12} />To answer, thy ledger is sent to Anthropic — sums, and individual inscriptions when a question demands.</div>
      </div>
    );
  }

  window.Oracle = Oracle;
  window.OracleKeyForm = KeyForm; // reused by Settings
  window.OracleMD = MD;           // exposed for tests
})();
