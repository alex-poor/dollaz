// categories.jsx — Sigils & Incantations. One row per sigil; expand to edit its
// marks (merchant patterns) as multiline text, with per-mark spend shown.
(function () {
  const { useState } = React;
  const { Button, CatDot, Icon, Money } = window;
  const D = window.DATA;
  const KIND = { expense: 'toll', income: 'tithe', transfer: 'passage' };
  const PALETTE = ['#5fae84', '#4f79ad', '#c9a23f', '#8f6fb5', '#3f968f', '#b0403a', '#c06a8e', '#c47a3f', '#3fa0a0', '#5a5bb0'];
  const rid = (p) => p + '-' + Math.random().toString(36).slice(2, 8);

  function Modal({ title, onClose, children, footer }) {
    return <div className="modal-back" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><h3 style={{ fontSize: '1.1rem' }}>{title}</h3></div><div className="modal-body">{children}</div><div className="modal-foot">{footer}</div></div></div>;
  }

  function Categories({ app, toast }) {
    const DZ = window.DZ;
    const { state, setState, pushHistory } = app;
    const [expanded, setExpanded] = useState(null);   // category id being edited
    const [draft, setDraft] = useState('');            // textarea content (one mark per line)
    const [nameModal, setNameModal] = useState(null);  // {id?, value, kind}

    const rulesFor = (catId) => D.RULES.filter(r => r.categoryId === catId);
    const tally = (before, after) => {
      let named = 0, resigiled = 0;
      for (let i = 0; i < before.length; i++) { const b = before[i], a = after[i]; if (b.categoryId === a.categoryId) continue; if (!b.categoryId) named++; else if (a.categoryId) resigiled++; }
      return named || resigiled ? `${named} newly named${resigiled ? `, ${resigiled} re-sigiled` : ''}` : 'naught changed';
    };

    const openSigil = (c) => { setExpanded(c.id); setDraft(rulesFor(c.id).map(r => r.pattern).join('\n')); };
    const saveSigil = (c) => {
      const lines = [...new Set(draft.split('\n').map(s => s.trim().toUpperCase()).filter(Boolean))];
      const before = state.transactions;
      pushHistory();
      setState(s => {
        const rules = s.rules.filter(r => r.categoryId !== c.id).concat(lines.map(p => ({ id: rid('r'), pattern: p, categoryId: c.id, createdAt: 0 })));
        return { ...s, rules, transactions: DZ.applyRules(s.transactions, rules, false) };
      });
      const after = DZ.applyRules(before, [...state.rules.filter(r => r.categoryId !== c.id), ...lines.map(p => ({ id: 'x', pattern: p, categoryId: c.id, createdAt: 0 }))]);
      toast(`“${c.name}” bound to ${lines.length} mark${lines.length === 1 ? '' : 's'} — ${tally(before, after)}`);
      setExpanded(null);
    };

    const addCategory = (name, kind) => { pushHistory(); setState(s => ({ ...s, categories: [...s.categories, { id: rid('c'), name, kind, color: PALETTE[s.categories.length % PALETTE.length] }] })); };
    const renameCategory = (id, name) => { pushHistory(); setState(s => ({ ...s, categories: s.categories.map(c => c.id === id ? { ...c, name } : c) })); };
    const setColor = (id, color) => { pushHistory(); setState(s => ({ ...s, categories: s.categories.map(c => c.id === id ? { ...c, color } : c) })); };
    const setKind = (id, kind) => { pushHistory(); setState(s => ({ ...s, categories: s.categories.map(c => c.id === id ? { ...c, kind } : c) })); };
    const delCategory = (id) => { pushHistory(); setState(s => ({ ...s, categories: s.categories.filter(c => c.id !== id), rules: s.rules.filter(r => r.categoryId !== id), transactions: s.transactions.map(t => t.categoryId === id ? { ...t, categoryId: null } : t) })); toast('Sigil unmade'); if (expanded === id) setExpanded(null); };
    const reapply = () => {
      const before = state.transactions;
      pushHistory(); setState(s => ({ ...s, transactions: DZ.applyRules(s.transactions, s.rules, true) }));
      toast(`Incantations recast — ${tally(before, DZ.applyRules(before, state.rules, true))}`);
    };

    const submitName = () => { const v = nameModal.value.trim(); if (!v) return; if (nameModal.id) renameCategory(nameModal.id, v); else addCategory(v, nameModal.kind || 'expense'); setNameModal(null); };

    return (
      <div className="content narrow">
        <div className="page-head">
          <div><div className="page-title">Sigils &amp; Incantations</div><div className="page-meta">By what marks thine inscriptions are known</div></div>
          <div className="row" style={{ gap: 'var(--s3)' }}>
            <Button iconName="refresh" onClick={reapply}>Recast the incantations</Button>
            <Button variant="primary" iconName="plus" onClick={() => setNameModal({ value: '', kind: 'expense' })}>Inscribe a sigil</Button>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ padding: 'var(--s2)' }}>
            {state.categories.map((c) => {
              const pats = rulesFor(c.id);
              const isOpen = expanded === c.id;
              return (
                <div key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="row" style={{ justifyContent: 'space-between', padding: '12px var(--s3)' }}>
                    <span className="row" style={{ gap: 11, minWidth: 0 }}>
                      <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => isOpen ? setExpanded(null) : openSigil(c)} title="Reveal its marks"><Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={16} /></button>
                      <label style={{ position: 'relative', width: 16, height: 16, cursor: 'pointer', flex: 'none' }}><span className="cat-dot lg" style={{ background: c.color, width: 16, height: 16, borderRadius: 5 }} /><input type="color" value={c.color} onChange={e => setColor(c.id, e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} /></label>
                      <span style={{ fontWeight: 600, color: 'var(--text-strong)', whiteSpace: 'nowrap' }}>{c.name}</span>
                      <select className="input" style={{ width: 'auto', padding: '2px 6px', fontSize: '0.8rem' }} value={c.kind} onChange={e => setKind(c.id, e.target.value)}><option value="expense">toll</option><option value="income">tithe</option><option value="transfer">passage</option></select>
                    </span>
                    <span className="row" style={{ gap: 'var(--s3)' }}>
                      <span className="num" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{pats.length} mark{pats.length === 1 ? '' : 's'} · {D.catCounts[c.id] || 0} bound</span>
                      <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setNameModal({ id: c.id, value: c.name })} title="Rename"><Icon name="edit" size={16} /></button>
                      <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => delCategory(c.id)} title="Unmake"><Icon name="trash" size={16} /></button>
                    </span>
                  </div>
                  {isOpen && (
                    <div style={{ padding: '0 var(--s3) var(--s5) 49px' }}>
                      <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 8 }}>The marks by which this sigil is known — one merchant or payee to a line. Any inscription bearing a mark is bound to this sigil.</div>
                      <textarea className="input" value={draft} onChange={e => setDraft(e.target.value)} spellCheck={false} rows={Math.max(4, draft.split('\n').length + 1)} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.86rem', lineHeight: 1.6, resize: 'vertical' }} placeholder={'COUNTDOWN\nPAK N SAVE\nNEW WORLD'} />
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s3)' }}>
                        <Button variant="ghost" onClick={() => setExpanded(null)}>Discard</Button>
                        <Button variant="primary" iconName="check" onClick={() => saveSigil(c)}>Seal</Button>
                      </div>
                      {pats.length > 0 && (
                        <div style={{ marginTop: 'var(--s4)', borderTop: '1px solid var(--border)', paddingTop: 'var(--s3)' }}>
                          <div className="stat-label" style={{ marginBottom: 6 }}>What each mark hath drawn</div>
                          {pats.slice().sort((a, b) => b.total - a.total).map(r => (
                            <div key={r.id} className="row" style={{ justifyContent: 'space-between', padding: '4px 0', fontSize: '0.88rem' }}>
                              <code style={{ background: 'var(--surface-2)', padding: '2px 7px', borderRadius: 5, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{r.pattern}</code>
                              <span className="row" style={{ gap: 'var(--s4)' }}><span className="num" style={{ color: 'var(--text-dim)' }}>{r.matches}×</span><Money value={r.total} className="num" style={{ fontWeight: 600 }} /></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {nameModal && <Modal title={nameModal.id ? 'Rename sigil' : 'Inscribe a sigil'} onClose={() => setNameModal(null)} footer={<><Button variant="ghost" onClick={() => setNameModal(null)}>Cancel</Button><Button variant="primary" onClick={submitName}>Inscribe</Button></>}><div className="field"><label>Name</label><input className="input" autoFocus value={nameModal.value} onChange={e => setNameModal(m => ({ ...m, value: e.target.value }))} onKeyDown={e => e.key === 'Enter' && submitName()} placeholder="e.g. Wards & Charms" /></div></Modal>}
      </div>
    );
  }
  window.Categories = Categories;
})();
