// format.js — window.fmtCurrency / fmtNumber / fmtMonth / fmtDate
(function () {
  let SYMBOL = "$"; // NZD

  function setCurrencySymbol(s) { SYMBOL = s; }

  function fmtCurrency(n, opts = {}) {
    const { compact = false, sign = false, cents = "auto" } = opts;
    const neg = n < 0;
    let abs = Math.abs(n);
    let body;
    if (compact && abs >= 1000) {
      if (abs >= 1e6) body = (abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1) + "M";
      else body = (abs / 1000).toFixed(abs >= 1e5 ? 0 : 1) + "k";
    } else {
      const showCents = cents === true || (cents === "auto" && abs < 100000);
      body = abs.toLocaleString("en-NZ", {
        minimumFractionDigits: showCents ? 2 : 0,
        maximumFractionDigits: showCents ? 2 : 0,
      });
    }
    const s = SYMBOL + body;
    if (sign) return (neg ? "−" : "+") + s;
    return (neg ? "−" : "") + s;
  }

  function fmtNumber(n) { return Number(n).toLocaleString("en-NZ"); }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtMonth(ym) {
    // ym like '2026-06' or Date
    if (typeof ym === "string") {
      const [y, m] = ym.split("-").map(Number);
      return MONTHS[m - 1] + " " + String(y).slice(2);
    }
    const d = new Date(ym);
    return MONTHS[d.getMonth()] + " " + String(d.getFullYear()).slice(2);
  }
  function fmtMonthLong(ym) {
    const [y, m] = ym.split("-").map(Number);
    const long = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return long[m - 1] + " " + y;
  }
  function fmtDate(d) {
    const dt = typeof d === "string" ? new Date(d + "T00:00:00") : d;
    return dt.getDate() + " " + MONTHS[dt.getMonth()];
  }

  Object.assign(window, { fmtCurrency, fmtNumber, fmtMonth, fmtMonthLong, fmtDate, setCurrencySymbol });
})();
