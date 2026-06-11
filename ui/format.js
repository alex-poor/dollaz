// format.js — money / number / date formatting helpers exposed on window.
// Currency symbol is read from the live settings (set by state.jsx) so the
// whole UI re-formats when the user changes it.

(function () {
  function currencySymbol() {
    try { return (window.__dz_currency || '$'); } catch { return '$'; }
  }

  function fmtCurrency(value, opts = {}) {
    const { compact = false, decimals = 2, sign = false } = opts;
    if (value == null || isNaN(value)) return currencySymbol() + '0';
    const neg = value < 0;
    let abs = Math.abs(value);
    let body;
    if (compact && abs >= 1000) {
      if (abs >= 1e6) body = (abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1) + 'M';
      else body = (abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1) + 'k';
    } else {
      body = abs.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
    const s = currencySymbol() + body;
    if (neg) return '-' + s;
    return sign ? '+' + s : s;
  }

  function fmtNumber(value, decimals = 0) {
    if (value == null || isNaN(value)) return '0';
    return Number(value).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // 'yyyy-mm' -> 'Mon yyyy'
  function fmtMonth(ym) {
    if (!ym) return '';
    const [y, m] = ym.split('-').map(Number);
    return `${MONTH_NAMES[(m || 1) - 1]} ${y}`;
  }
  // 'yyyy-mm' -> "Mon 'yy" (compact axis label)
  function fmtMonthShort(ym) {
    if (!ym) return '';
    const [y, m] = ym.split('-').map(Number);
    return `${MONTH_NAMES[(m || 1) - 1]} '${String(y).slice(2)}`;
  }
  // 'yyyy-mm-dd' -> 'd Mon yyyy'
  function fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MONTH_NAMES[(m || 1) - 1]} ${y}`;
  }

  Object.assign(window, { fmtCurrency, fmtNumber, fmtMonth, fmtMonthShort, fmtDate, MONTH_NAMES });
})();
