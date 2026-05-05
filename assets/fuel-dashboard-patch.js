(() => {
  function n(value) {
    return window.ReportUtils?.number ? window.ReportUtils.number(value) : Number(value || 0) || 0;
  }

  function format(value) {
    const x = n(value);
    if (!x) return '_';
    return Number.isInteger(x) ? String(x) : String(+x.toFixed(2));
  }

  function latestReportWithStock(reports) {
    return [...(reports || [])]
      .filter(r => n(r?.fuel?.currentBalance) || n(r?.fuel?.previousBalance) || n(r?.fuel?.consumedDaily))
      .sort((a, b) => String(b.reportDate || '').localeCompare(String(a.reportDate || '')))[0] || null;
  }

  function totalConsumed(reports) {
    return (reports || []).reduce((sum, r) => sum + n(r?.fuel?.consumedDaily), 0);
  }

  function totalSupplied(reports) {
    return (reports || []).reduce((sum, r) => sum + n(r?.fuel?.municipalSupplied) + n(r?.fuel?.addedDaily), 0);
  }

  function stockValue(report) {
    return n(report?.fuel?.currentBalance);
  }

  function fuelKpiCards(reports) {
    const latest = latestReportWithStock(reports);
    const stock = latest ? stockValue(latest) : 0;
    const date = latest?.reportDate ? window.ReportUtils.displayDate(latest.reportDate) : 'لا يوجد رصيد';
    const consumed = totalConsumed(reports);
    const supplied = totalSupplied(reports);

    return `
      <article class="kpi-card fuel-kpi fuel-stock-kpi">
        <div class="kpi-icon">📦</div>
        <span>السولار في المخزون</span>
        <strong>${format(stock)}</strong>
        <small>آخر رصيد مسجل بتاريخ ${date}</small>
      </article>
      <article class="kpi-card fuel-kpi fuel-supplied-kpi">
        <div class="kpi-icon">⛽</div>
        <span>إجمالي السولار المستلم</span>
        <strong>${format(supplied)}</strong>
        <small>المضاف + المورد من البلدية</small>
      </article>
      <article class="kpi-card fuel-kpi fuel-consumed-kpi">
        <div class="kpi-icon">🔥</div>
        <span>إجمالي السولار المستهلك</span>
        <strong>${format(consumed)}</strong>
        <small>حسب كل التقارير المحفوظة</small>
      </article>`;
  }

  function addFuelToReportCards(html, reports) {
    let index = 0;
    return html.replace(/<button class="report-card[\s\S]*?<\/button>/g, cardHtml => {
      const report = reports[index++];
      if (!report) return cardHtml;
      const consumed = format(report?.fuel?.consumedDaily);
      const stock = format(report?.fuel?.currentBalance);
      const fuelStrip = `<div class="fuel-card-strip"><span>🔥 مستهلك: ${consumed} لتر</span><span>📦 مخزون: ${stock} لتر</span></div>`;
      return cardHtml.replace('</button>', `${fuelStrip}</button>`);
    });
  }

  function addFuelToDetails(html, active) {
    if (!active) return html;
    const stock = format(active?.fuel?.currentBalance);
    const added = format(n(active?.fuel?.addedDaily) + n(active?.fuel?.municipalSupplied));
    const extra = `<article><span>مخزون السولار</span><strong>${stock} لتر</strong></article><article><span>سولار مستلم اليوم</span><strong>${added} لتر</strong></article>`;
    return html.replace(/(<div class="detail-grid">[\s\S]*?)(<\/div><section class="tests-summary">)/, `$1${extra}$2`);
  }

  function patchLayout() {
    if (!window.AppUI || window.AppUI.__fuelDashboardPatched) return;
    const originalLayout = window.AppUI.layout;
    window.AppUI.layout = function patchedFuelLayout(state, settings) {
      const reports = state?.reports || [];
      const active = reports.find(r => r.id === state.currentId) || null;
      let html = originalLayout(state, settings);

      html = html.replace('</section><section id="reports"', `${fuelKpiCards(reports)}</section><section id="reports"`);
      html = addFuelToReportCards(html, reports);
      html = addFuelToDetails(html, active);
      return html;
    };
    window.AppUI.__fuelDashboardPatched = true;
  }

  patchLayout();
  window.addEventListener('DOMContentLoaded', patchLayout);
})();
