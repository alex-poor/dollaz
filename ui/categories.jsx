// categories.jsx — Sigils & Incantations (categories + rules), real CRUD.
(function () {
  const { useState } = React;
  const { Button, CatDot, Icon } = window;
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
    const [nameModal, setNameModal] = useState(null); // {id?, value}
    const [kindOf, setKindOf] = useState('expense');
    const [ruleModal, setRuleModal] = useState(false);
    const [rulePattern, setRulePattern] = useState('');
    const [ruleCat, setRuleCat] = useState(state.categories[0]?.id || '');

    const update = (fn, t) => { pushHistory(); setState(fn); if (t) toast(t); };

    const saveCategory = () => {
      const name = nameModal.value.trim(); if (!name) return;
      if (nameModal.id) update(s => ({ ...s, categories: s.categories.map(c => c.id === nameModal.id ? { ...c, name } : c) }));
      else update(s => ({ ...s, categories: [...s.categories, { id: rid('c'), name, kind: kindOf, color: PALETTE[s.categories.length % PALETTE.length] }] }));
      setNameModal(null);
    };
    const setColor = (id, color) => update(s => ({ ...s, categories: s.categories.map(c => c.id === id ? { ...c, color } : c) }));
    const setKind = (id, kind) => update(s => ({ ...s, categories: s.categories.map(c => c.id === id ? { ...c, kind } : c) }));
    const delCategory = (id) => update(s => ({ ...s, categories: s.categories.filter(c => c.id !== id), rules: s.rules.filter(r => r.categoryId !== id), transactions: s.transactions.map(t => t.categoryId === id ? { ...t, categoryId: null } : t) }), 'Sigil unmade');
    const addRule = () => {
      const p = rulePattern.trim(); if (!p || !ruleCat) return;
      update(s => { const rules = [...s.rules, { id: rid('r'), pattern: p.toUpperCase(), categoryId: ruleCat, createdAt: 0 }]; return { ...s, rules, transactions: DZ.applyRules(s.transactions, rules) }; }, 'Incantation inscribed');
      setRuleModal(false); setRulePattern('');
    };
    const delRule = (id) => update(s => ({ ...s, rules: s.rules.filter(r => r.id !== id) }));
    const reapply = () => update(s => ({ ...s, transactions: DZ.applyRules(s.transactions, s.rules, true) }), `The incantations recast across ${state.transactions.length} inscriptions`);

    return (
      <div className="content wide">
        <div className="page-head"><div><div className="page-title">Sigils &amp; Incantations</div><div className="page-meta">By what laws thine inscriptions are bound</div></div><Button iconName="refresh" onClick={reapply}>Recast the incantations</Button></div>
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <div className="card">
            <div className="card-head"><div className="card-title">Sigils</div><Button variant="ghost" size="sm" iconName="plus" onClick={() => { setKindOf('expense'); setNameModal({ value: '' }); }}>Inscribe</Button></div>
            <div className="card-body" style={{ paddingTop: 'var(--s2)' }}>
              {state.categories.map((c, i) => (
                <div key={c.id} className="row" style={{ justifyContent: 'space-between', padding: '10px 0', borderBottom: i < state.categories.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span className="row" style={{ gap: 11 }}>
                    <label style={{ position: 'relative', width: 16, height: 16, cursor: 'pointer' }}><span className="cat-dot lg" style={{ background: c.color, width: 16, height: 16, borderRadius: 5 }} /><input type="color" value={c.color} onChange={e => setColor(c.id, e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} /></label>
                    <span style={{ fontWeight: 600, color: 'var(--text-strong)', whiteSpace: 'nowrap' }}>{c.name}</span>
                    <select className="input" style={{ width: 'auto', padding: '2px 6px', fontSize: '0.8rem' }} value={c.kind} onChange={e => setKind(c.id, e.target.value)}><option value="expense">toll</option><option value="income">tithe</option><option value="transfer">passage</option></select>
                  </span>
                  <span className="row" style={{ gap: 'var(--s4)' }}>
                    <span className="num" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{D.catCounts[c.id] || 0} entries</span>
                    <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setNameModal({ id: c.id, value: c.name })}><Icon name="edit" size={16} /></button>
                    <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => delCategory(c.id)}><Icon name="trash" size={16} /></button>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Incantations</div><Button variant="ghost" size="sm" iconName="plus" onClick={() => { setRuleCat(state.categories[0]?.id || ''); setRuleModal(true); }}>Inscribe</Button></div>
            <div className="card-body" style={{ paddingTop: 'var(--s2)' }}>
              {D.RULES.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>No incantations yet — they're forged as thou bestow'st sigils on imports, or inscribe one here.</p> : D.RULES.map((r, i) => {
                const c = D.catById[r.categoryId];
                return (
                  <div key={r.id} className="row" style={{ justifyContent: 'space-between', padding: '10px 0', borderBottom: i < D.RULES.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span className="row" style={{ gap: 11 }}>
                      <code style={{ background: 'var(--surface-2)', padding: '3px 9px', borderRadius: 6, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{r.pattern}</code>
                      <Icon name="chevronRight" size={14} style={{ color: 'var(--text-dim)' }} />
                      {c ? <span className="cat-pill"><CatDot color={c.color} />{c.name}</span> : <span className="cat-pill unmapped">—</span>}
                    </span>
                    <span className="row" style={{ gap: 'var(--s3)' }}><span className="num" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{r.matches}×</span><button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => delRule(r.id)}><Icon name="trash" size={16} /></button></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {nameModal && <Modal title={nameModal.id ? 'Rename sigil' : 'Inscribe a sigil'} onClose={() => setNameModal(null)} footer={<><Button variant="ghost" onClick={() => setNameModal(null)}>Cancel</Button><Button variant="primary" onClick={saveCategory}>Inscribe</Button></>}><div className="field"><label>Name</label><input className="input" autoFocus value={nameModal.value} onChange={e => setNameModal(m => ({ ...m, value: e.target.value }))} onKeyDown={e => e.key === 'Enter' && saveCategory()} placeholder="e.g. Wards & Charms" /></div></Modal>}
        {ruleModal && <Modal title="Inscribe an incantation" onClose={() => setRuleModal(false)} footer={<><Button variant="ghost" onClick={() => setRuleModal(false)}>Cancel</Button><Button variant="primary" onClick={addRule}>Inscribe</Button></>}><div className="field" style={{ marginBottom: 'var(--s4)' }}><label>When the inscription bears</label><input className="input" autoFocus value={rulePattern} onChange={e => setRulePattern(e.target.value)} placeholder="e.g. COUNTDOWN" /></div><div className="field"><label>Bestow the sigil</label><select className="input" value={ruleCat} onChange={e => setRuleCat(e.target.value)}>{state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></Modal>}
      </div>
    );
  }
  window.Categories = Categories;
})();
