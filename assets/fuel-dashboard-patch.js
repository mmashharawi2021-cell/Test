(() => {
  function core() {
    return window.WaterFuelCore;
  }

  function format(value) {
    return core()?.format ? core().format(value) : String(value || '_');
  }

  function fuelKpiCards(reports) {
    const summary = core()?.getSummary ? core().getSummary(reports, window.WaterFuelRawEntries || []) : null;
    if (!summary) return '';
    const date = summary.stockDate ? core().displayDate(summary.stockDate) : 'لا يوجد رصيد';

    return `
      <article class="kpi-card fuel-kpi fuel-stock-kpi official-stock-kpi">
        <div class="kpi-icon">📦</div>
        <span>آخر رصيد فعلي للمخزون</span>
        <strong>${format(summary.lastStock)}</strong>
        <small>آخر رصيد محفوظ في التقرير اليومي بتاريخ ${date}</small>
      </article>
      <article class="kpi-card fuel-kpi fuel-supplied-kpi official-incoming-fuel-kpi">
        <div class="kpi-icon">⛽</div>
        <span>وقود وارد مسجل</span>
        <strong>${format(summary.incomingTotal)}</strong>
        <small>من سجل إضافة وقود وارد</small>
      </article>
      <article class="kpi-card fuel-kpi fuel-consumed-kpi official-consumed-fuel-kpi">
        <div class="kpi-icon">🔥</div>
        <span>وقود مستهلك بالتقارير</span>
        <strong>${format(summary.consumedTotal)}</strong>
        <small>من التقارير اليومية المحفوظة</small>
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
    const added = format((core()?.number(active?.fuel?.addedDaily) || 0) + (core()?.number(active?.fuel?.municipalSupplied) || 0));
    const loss = format(active?.fuel?.loss);
    const extra = `<article><span>مخزون السولار</span><strong>${stock} لتر</strong></article><article><span>سولار مستلم داخل التقرير</span><strong>${added} لتر</strong></article><article><span>فرق/فاقد السولار</span><strong>${loss} لتر</strong></article>`;
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
