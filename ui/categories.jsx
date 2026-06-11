// categories.jsx — manage categories and the retained merchant→category rules.
const { ICONS, Button, CatDot, PromptModal, ConfirmModal } = window;

const PALETTE = ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#6366f1', '#2dbd7e', '#9aa0a6'];

function CategoriesScreen({ state, setState, pushHistory, pushToast }) {
  const DZ = window.DZ;
  const { categories, rules, transactions } = state;
  const [newCat, setNewCat] = React.useState(false);
  const [editCat, setEditCat] = React.useState(null);
  const [confirmCat, setConfirmCat] = React.useState(null);
  const [newRule, setNewRule] = React.useState(false);
  const [confirmRule, setConfirmRule] = React.useState(null);

  // Counts per category / per rule for context.
  const catCount = React.useMemo(() => {
    const m = {};
    for (const t of transactions) if (t.categoryId) m[t.categoryId] = (m[t.categoryId] || 0) + 1;
    return m;
  }, [transactions]);
  const ruleCount = React.useMemo(() => {
    const m = {};
    for (const r of rules) m[r.id] = 0;
    for (const t of transactions) {
      const r = DZ.matchRule(t.raw || t.description, rules);
      if (r) m[r.id] = (m[r.id] || 0) + 1;
    }
    return m;
  }, [rules, transactions]);

  const catName = (id) => categories.find(c => c.id === id)?.name || 'Uncategorised';

  const addCategory = (name) => {
    pushHistory();
    setState(s => ({ ...s, categories: [...s.categories, { id: 'c-' + Math.random().toString(36).slice(2, 8), name, kind: 'expense', color: PALETTE[s.categories.length % PALETTE.length] }] }));
  };
  const updateCategory = (id, patch) => {
    pushHistory();
    setState(s => ({ ...s, categories: s.categories.map(c => c.id === id ? { ...c, ...patch } : c) }));
  };
  const deleteCategory = (id) => {
    pushHistory();
    setState(s => ({
      ...s,
      categories: s.categories.filter(c => c.id !== id),
      rules: s.rules.filter(r => r.categoryId !== id),
      transactions: s.transactions.map(t => t.categoryId === id ? { ...t, categoryId: null } : t),
    }));
    pushToast({ msg: 'Category deleted; its transactions are now uncategorised' });
  };

  const addRule = (pattern, categoryId) => {
    pushHistory();
    setState(s => {
      const rules = [...s.rules, { id: 'r-' + Math.random().toString(36).slice(2, 8), pattern: pattern.toUpperCase(), categoryId, createdAt: 0 }];
      return { ...s, rules, transactions: DZ.applyRules(s.transactions, rules) };
    });
  };
  const deleteRule = (id) => { pushHistory(); setState(s => ({ ...s, rules: s.rules.filter(r => r.id !== id) })); };

  const reapply = () => {
    pushHistory();
    setState(s => ({ ...s, transactions: DZ.applyRules(s.transactions, s.rules, true) }));
    pushToast({ msg: 'Rules re-applied to all transactions' });
  };

  return (
    <div className="content narrow">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Categories & rules</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>Rules map a description substring to a category and apply to every import.</div>
        </div>
        <Button variant="ghost" onClick={reapply} title="Re-run every rule over all transactions">Re-apply rules</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 18, alignItems: 'start' }}>
        {/* Categories */}
        <div className="card">
          <div className="card-head"><h3>Categories</h3><div style={{ flex: 1 }}/><Button size="sm" icon={<ICONS.Plus/>} onClick={() => setNewCat(true)}>Add</Button></div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr><th>Name</th><th>Type</th><th className="num">Txns</th><th></th></tr></thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id}>
                    <td>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', position: 'relative' }}>
                        <input type="color" value={c.color} onChange={e => updateCategory(c.id, { color: e.target.value })}
                          style={{ width: 16, height: 16, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}/>
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                      </label>
                    </td>
                    <td>
                      <select className="input" style={{ fontSize: 12, padding: '3px 6px', width: 'auto' }} value={c.kind} onChange={e => updateCategory(c.id, { kind: e.target.value })}>
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                        <option value="transfer">Transfer</option>
                      </select>
                    </td>
                    <td className="num" style={{ color: 'var(--text-muted)' }}>{catCount[c.id] || 0}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn ghost sm icon" title="Rename" onClick={() => setEditCat(c)}><ICONS.Edit size={13}/></button>
                      <button className="btn ghost sm icon" title="Delete" onClick={() => setConfirmCat(c)}><ICONS.Trash size={13}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rules */}
        <div className="card">
          <div className="card-head"><h3>Rules</h3><span className="sub">{rules.length}</span><div style={{ flex: 1 }}/><Button size="sm" icon={<ICONS.Plus/>} onClick={() => setNewRule(true)}>Add rule</Button></div>
          <div className="card-body" style={{ padding: 0 }}>
            {rules.length === 0 ? <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>No rules yet. They're created as you categorise imports, or add one here.</div> : (
              <table className="table">
                <thead><tr><th>If description contains</th><th>Category</th><th className="num">Matches</th><th></th></tr></thead>
                <tbody>
                  {rules.map(r => {
                    const cat = categories.find(c => c.id === r.categoryId);
                    return (
                      <tr key={r.id}>
                        <td><code style={{ fontSize: 12.5, background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4 }}>{r.pattern}</code></td>
                        <td>
                          <select className="input" style={{ fontSize: 12.5, padding: '3px 6px', width: 'auto' }} value={r.categoryId}
                            onChange={e => { pushHistory(); setState(s => ({ ...s, rules: s.rules.map(x => x.id === r.id ? { ...x, categoryId: e.target.value } : x), transactions: DZ.applyRules(s.transactions, s.rules.map(x => x.id === r.id ? { ...x, categoryId: e.target.value } : x), true) })); }}>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </td>
                        <td className="num" style={{ color: 'var(--text-muted)' }}>{ruleCount[r.id] || 0}</td>
                        <td style={{ textAlign: 'right' }}><button className="btn ghost sm icon" title="Delete" onClick={() => setConfirmRule(r)}><ICONS.Trash size={13}/></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <PromptModal open={newCat} title="New category" label="Name" placeholder="e.g. Pets" onClose={() => setNewCat(false)} onSubmit={(n) => { addCategory(n); setNewCat(false); }}/>
      <PromptModal open={!!editCat} title="Rename category" label="Name" initialValue={editCat?.name || ''} onClose={() => setEditCat(null)} onSubmit={(n) => { updateCategory(editCat.id, { name: n }); setEditCat(null); }}/>
      <RuleModal open={newRule} categories={categories} onClose={() => setNewRule(false)} onSubmit={(p, c) => { addRule(p, c); setNewRule(false); }}/>
      <ConfirmModal open={!!confirmCat} title={`Delete “${confirmCat?.name}”?`} body="Its rules are removed and its transactions become uncategorised." confirmLabel="Delete" onConfirm={() => deleteCategory(confirmCat.id)} onClose={() => setConfirmCat(null)}/>
      <ConfirmModal open={!!confirmRule} title="Delete rule?" body={`Transactions stay as they are; future imports won't use “${confirmRule?.pattern}”.`} confirmLabel="Delete" onConfirm={() => deleteRule(confirmRule.id)} onClose={() => setConfirmRule(null)}/>
    </div>
  );
}

function RuleModal({ open, categories, onClose, onSubmit }) {
  const [pattern, setPattern] = React.useState('');
  const [catId, setCatId] = React.useState(categories[0]?.id || '');
  React.useEffect(() => { if (open) { setPattern(''); setCatId(categories[0]?.id || ''); } }, [open]);
  if (!open) return null;
  return (
    <window.Modal open={open} title="New rule" onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!pattern.trim() || !catId} onClick={() => onSubmit(pattern.trim(), catId)}>Add rule</Button>
      </>}>
      <div className="field" style={{ marginBottom: 12 }}>
        <label>If description contains</label>
        <input className="input" value={pattern} placeholder="e.g. WOOLWORTHS" onChange={e => setPattern(e.target.value)} autoFocus/>
      </div>
      <div className="field">
        <label>Category</label>
        <select className="input" value={catId} onChange={e => setCatId(e.target.value)}>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
    </window.Modal>
  );
}

window.CategoriesScreen = CategoriesScreen;
