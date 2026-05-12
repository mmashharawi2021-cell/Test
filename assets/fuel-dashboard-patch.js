(() => {
  const TOLERANCE = 1;

  function n(value) {
    return window.ReportUtils?.number ? window.ReportUtils.number(value) : Number(value || 0) || 0;
  }

  function format(value) {
    const x = n(value);
    if (!x) return '_';
    return Number.isInteger(x) ? String(x) : String(+x.toFixed(2));
  }

  function formatSigned(value) {
    const x = n(value);
    const sign = x > 0 ? '+' : '';
    return `${sign}${Number.isInteger(x) ? x : +x.toFixed(2)}`;
  }

  function hasFuelNumber(value) {
    return value !== undefined && value !== null && String(value).trim() !== '' && Number.isFinite(n(value));
  }

  function chronologicalReports(reports) {
    return [...(reports || [])]
      .filter(r => r?.reportDate)
      .sort((a, b) => String(a.reportDate || '').localeCompare(String(b.reportDate || '')));
  }

  function latestReportWithStock(reports) {
    return [...(reports || [])]
      .filter(r => hasFuelNumber(r?.fuel?.currentBalance) || hasFuelNumber(r?.fuel?.previousBalance) || hasFuelNumber(r?.fuel?.consumedDaily))
      .sort((a, b) => String(b.reportDate || '').localeCompare(String(a.reportDate || '')))[0] || null;
  }

  function totalConsumed(reports) {
    return (reports || []).reduce((sum, r) => sum + n(r?.fuel?.consumedDaily), 0);
  }

  function totalSupplied(reports) {
    return (reports || []).reduce((sum, r) => sum + n(r?.fuel?.municipalSupplied) + n(r?.fuel?.addedDaily), 0);
  }

  function totalFuelLoss(reports) {
    return (reports || []).reduce((sum, r) => sum + n(r?.fuel?.loss), 0);
  }

  function stockValue(report) {
    return n(report?.fuel?.currentBalance);
  }

  function fuelAudit(reports) {
    const sorted = chronologicalReports(reports).filter(r => r?.fuel);
    const first = sorted.find(r => hasFuelNumber(r?.fuel?.previousBalance) || hasFuelNumber(r?.fuel?.currentBalance));
    const latest = latestReportWithStock(sorted);
    const openingBalance = n(first?.fuel?.previousBalance);
    const supplied = totalSupplied(sorted);
    const consumed = totalConsumed(sorted);
    const loss = totalFuelLoss(sorted);
    const expectedCurrent = openingBalance + supplied - consumed - loss;
    const latestCurrent = latest ? stockValue(latest) : 0;
    const difference = latest ? latestCurrent - expectedCurrent : 0;

    const rowIssues = [];
    sorted.forEach(report => {
      const f = report.fuel || {};
      const hasBalanceData = hasFuelNumber(f.previousBalance) || hasFuelNumber(f.addedDaily) || hasFuelNumber(f.municipalSupplied) || hasFuelNumber(f.consumedDaily) || hasFuelNumber(f.currentBalance) || hasFuelNumber(f.loss);
      if (!hasBalanceData || !hasFuelNumber(f.currentBalance)) return;
      const expected = n(f.previousBalance) + n(f.addedDaily) + n(f.municipalSupplied) - n(f.consumedDaily) - n(f.loss);
      const diff = n(f.currentBalance) - expected;
      if (Math.abs(diff) > TOLERANCE) {
        rowIssues.push({ date: report.reportDate, diff });
      }
    });

    const chainIssues = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const previous = sorted[i - 1];
      const current = sorted[i];
      if (!hasFuelNumber(previous?.fuel?.currentBalance) || !hasFuelNumber(current?.fuel?.previousBalance)) continue;
      const diff = n(current.fuel.previousBalance) - n(previous.fuel.currentBalance);
      if (Math.abs(diff) > TOLERANCE) {
        chainIssues.push({ date: current.reportDate, previousDate: previous.reportDate, diff });
      }
    }

    return { first, latest, openingBalance, supplied, consumed, loss, expectedCurrent, latestCurrent, difference, rowIssues, chainIssues };
  }

  function auditStatus(audit) {
    if (!audit.latest) return { state: 'empty', label: 'لا توجد بيانات وقود كافية', hint: 'أدخل تقارير الوقود أولًا' };
    if (audit.rowIssues.length || audit.chainIssues.length || Math.abs(audit.difference) > TOLERANCE) {
      return { state: 'warn', label: 'يحتاج مراجعة', hint: `فرق التدقيق: ${formatSigned(audit.difference)} لتر` };
    }
    return { state: 'ok', label: 'مطابق', hint: 'الرصيد متوافق مع المعادلة' };
  }

  function fuelKpiCards(reports) {
    const audit = fuelAudit(reports);
    const latest = audit.latest;
    const stock = latest ? stockValue(latest) : 0;
    const date = latest?.reportDate ? window.ReportUtils.displayDate(latest.reportDate) : 'لا يوجد رصيد';
    const status = auditStatus(audit);

    return `
      <article class="kpi-card fuel-kpi fuel-stock-kpi">
        <div class="kpi-icon">📦</div>
        <span>السولار في المخزون</span>
        <strong>${format(stock)}</strong>
        <small>آخر رصيد رسمي بتاريخ ${date}</small>
      </article>
      <article class="kpi-card fuel-kpi fuel-supplied-kpi">
        <div class="kpi-icon">⛽</div>
        <span>سولار مستلم بالتقارير</span>
        <strong>${format(audit.supplied)}</strong>
        <small>مضاف يومي + مورد البلدية</small>
      </article>
      <article class="kpi-card fuel-kpi fuel-consumed-kpi">
        <div class="kpi-icon">🔥</div>
        <span>إجمالي السولار المستهلك</span>
        <strong>${format(audit.consumed)}</strong>
        <small>حسب كل التقارير المحفوظة</small>
      </article>
      <article class="kpi-card fuel-kpi fuel-audit-kpi ${status.state}">
        <div class="kpi-icon">🧮</div>
        <span>تدقيق رصيد الوقود</span>
        <strong>${status.label}</strong>
        <small>${status.hint}</small>
      </article>`;
  }

  function fuelAuditNotice(reports) {
    const audit = fuelAudit(reports);
    const status = auditStatus(audit);
    if (status.state !== 'warn') return '';

    const rowText = audit.rowIssues.slice(0, 3).map(item => `تقرير ${window.ReportUtils.displayDate(item.date)} فرق ${formatSigned(item.diff)} لتر`).join('، ');
    const chainText = audit.chainIssues.slice(0, 3).map(item => `الرصيد السابق في ${window.ReportUtils.displayDate(item.date)} لا يطابق رصيد ${window.ReportUtils.displayDate(item.previousDate)} بفارق ${formatSigned(item.diff)} لتر`).join('، ');
    const details = [
      `الرصيد الافتتاحي: ${format(audit.openingBalance)} لتر`,
      `المستلم: ${format(audit.supplied)} لتر`,
      `المستهلك: ${format(audit.consumed)} لتر`,
      `الفرق/الفاقد: ${format(audit.loss)} لتر`,
      `الرصيد المحسوب: ${format(audit.expectedCurrent)} لتر`,
      `آخر رصيد رسمي: ${format(audit.latestCurrent)} لتر`
    ].join(' | ');

    return `<section class="notice warn fuel-audit-notice"><strong>تنبيه تدقيق الوقود:</strong><p>هناك فرق بين رصيد الوقود الرسمي والمعادلة المحاسبية. ${details}</p>${rowText ? `<p>${rowText}</p>` : ''}${chainText ? `<p>${chainText}</p>` : ''}<p>قبل العرض الرسمي، راجع تقارير الوقود التي يظهر فيها الفرق أو حدّث الرصيد/الفاقد ليصبح الحساب متطابقًا.</p></section>`;
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
    const loss = format(active?.fuel?.loss);
    const extra = `<article><span>مخزون السولار</span><strong>${stock} لتر</strong></article><article><span>سولار مستلم اليوم</span><strong>${added} لتر</strong></article><article><span>فرق/فاقد السولار</span><strong>${loss} لتر</strong></article>`;
    return html.replace(/(<div class="detail-grid">[\s\S]*?)(<\/div><section class="tests-summary">)/, `$1${extra}$2`);
  }

  function patchLayout() {
    if (!window.AppUI || window.AppUI.__fuelDashboardPatched) return;
    const originalLayout = window.AppUI.layout;
    window.AppUI.layout = function patchedFuelLayout(state, settings) {
      const reports = state?.reports || [];
      const active = reports.find(r => r.id === state.currentId) || null;
      let html = originalLayout(state, settings);

      html = html.replace('</section><section id="reports"', `${fuelKpiCards(reports)}</section>${fuelAuditNotice(reports)}<section id="reports"`);
      html = addFuelToReportCards(html, reports);
      html = addFuelToDetails(html, active);
      return html;
    };
    window.AppUI.__fuelDashboardPatched = true;
  }

  patchLayout();
  window.addEventListener('DOMContentLoaded', patchLayout);
})();
