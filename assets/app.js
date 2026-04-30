window.App = (() => {
  let analyzedReport = null;

  function render() {
    const data = window.AppStore.load();
    document.getElementById('app').innerHTML = window.AppUI.layout(data);
  }

  function openSmart() {
    const modal = document.getElementById('smartModal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => document.getElementById('smartInput')?.focus(), 80);
  }

  function closeSmart() {
    const modal = document.getElementById('smartModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    analyzedReport = null;
  }

  function clearSmartInput() {
    const input = document.getElementById('smartInput');
    const result = document.getElementById('analysisResult');
    if (input) input.value = '';
    if (result) result.innerHTML = '';
    analyzedReport = null;
  }

  function analyzeSmart() {
    const result = document.getElementById('analysisResult');
    try {
      const text = document.getElementById('smartInput')?.value || '';
      analyzedReport = window.ReportParser.parse(text);
      result.innerHTML = window.AppUI.analysis(analyzedReport);
    } catch (error) {
      result.innerHTML = `<div class="notice warn"><p>${window.AppUI.escape(error.message || 'تعذر تحليل التقرير.')}</p></div>`;
    }
  }

  function saveAnalyzed() {
    if (!analyzedReport) return;
    const saved = window.AppStore.upsertReport(analyzedReport);
    window.AppStore.selectReport(saved.id);
    closeSmart();
    render();
  }

  function select(id) {
    window.AppStore.selectReport(id);
    render();
  }

  async function copyCurrent() {
    const data = window.AppStore.load();
    const report = (data.reports || []).find(item => item.id === data.currentId) || data.reports?.[0];
    if (!report) return;
    await navigator.clipboard.writeText(window.AppUI.whatsappText(report));
    alert('تم نسخ التقرير بصيغة واتساب.');
  }

  function removeCurrent() {
    const data = window.AppStore.load();
    const report = (data.reports || []).find(item => item.id === data.currentId) || data.reports?.[0];
    if (!report) return;
    if (!confirm('هل تريد حذف هذا التقرير؟')) return;
    window.AppStore.deleteReport(report.id);
    render();
  }

  function clearAll() {
    if (!confirm('هل تريد حذف جميع التقارير المحفوظة على هذا الجهاز؟')) return;
    window.AppStore.clearReports();
    render();
  }

  function exportExcel() {
    const data = window.AppStore.load();
    const rows = [['date','title','start','end','hours','fuel_added','fuel_consumed','water_total','cars_total','beneficiaries']];
    (data.reports || []).forEach(report => {
      rows.push([
        report.date,
        report.title,
        report.generatorStart,
        report.generatorEnd,
        report.runHours,
        report.fuelAdded,
        report.fuelConsumed,
        report.totalQuantity,
        report.totalCars,
        (report.beneficiaries || []).map(item => `${item.name}: ${item.quantity}/${item.cars}`).join(' | ')
      ]);
    });
    const csv = '\ufeff' + rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'water-reports.csv';
    link.click();
  }

  return { render, openSmart, closeSmart, clearSmartInput, analyzeSmart, saveAnalyzed, select, copyCurrent, removeCurrent, clearAll, exportExcel };
})();

window.addEventListener('DOMContentLoaded', () => window.App.render());
