(() => {
  const state = { open: false, reports: [] };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  }

  function core() { return window.WaterFuelCore; }

  function canUse() {
    const user = window.AuthUsers?.currentUser?.();
    if (!user) return true;
    return user.role === 'superAdmin' || user.roleLabel === 'مدير النظام' || window.AuthUsers?.hasPermission?.('manageSettings') === true;
  }

  function injectButton() {
    if (!canUse()) return;
    const menu = document.getElementById('heroMoreMenu');
    if (!menu || menu.querySelector('[data-audit-button]')) return;
    menu.insertAdjacentHTML('afterbegin', '<button class="btn toolbar-btn more-item" data-audit-button="true" type="button" onclick="WaterDataAudit.open()">🧪 فحص البيانات</button>');
  }

  function issueCard(type, title, body, reportId = '') {
    const action = reportId ? `<button class="mini" onclick="App.select('${esc(reportId)}'); WaterDataAudit.close();">فتح التقرير</button>` : '';
    return `<article class="audit-issue ${type}"><div><strong>${esc(title)}</strong><p>${body}</p></div>${action}</article>`;
  }

  function renderList(audit) {
    const rows = [];
    audit.fuelBalanceIssues.forEach(item => {
      rows.push(issueCard('critical', 'خطأ في رصيد الوقود', `تقرير ${esc(core().displayDate(item.report.reportDate))}: الرصيد المتوقع ${esc(core().format(item.expected, '0'))} لتر، المسجل ${esc(core().format(item.actual, '0'))} لتر، الفرق ${esc(core().formatSigned(item.diff))} لتر.`, item.report.id));
    });
    audit.waterOverProductionIssues.forEach(item => {
      rows.push(issueCard('critical', 'المياه المعبأة أكبر من الإنتاج', `تقرير ${esc(core().displayDate(item.report.reportDate))}: الإنتاج ${esc(core().format(item.production, '0'))} كوب، المعبأ ${esc(core().format(item.filled, '0'))} كوب.`, item.report.id));
    });
    audit.fuelChainIssues.forEach(item => {
      rows.push(issueCard('review', 'الرصيد السابق لا يطابق التقرير السابق', `تقرير ${esc(core().displayDate(item.report.reportDate))} يختلف عن رصيد ${esc(core().displayDate(item.previous.reportDate))} بفارق ${esc(core().formatSigned(item.diff))} لتر.`, item.report.id));
    });
    audit.duplicateDateReports.forEach(item => {
      rows.push(issueCard('review', 'أكثر من تقرير بنفس التاريخ', `التاريخ ${esc(core().displayDate(item.date))} يحتوي ${item.count} تقارير. راجع إن كان هذا مقصودًا.`));
    });
    audit.emptyConsumedReports.forEach(report => {
      rows.push(issueCard('review', 'استهلاك وقود فارغ', `تقرير ${esc(core().displayDate(report.reportDate))} يحتوي بيانات وقود لكن الاستهلاك فارغ.`, report.id));
    });
    audit.duplicateIncoming.forEach(entry => {
      rows.push(issueCard('review', 'سجل وقود وارد مكرر', `سجل بتاريخ ${esc(core().displayDate(entry.date))}، كمية ${esc(core().format(entry.quantityLiters, '0'))} لتر، المورد ${esc(entry.supplier || '-')}.`));
    });
    audit.missingTests.forEach(item => {
      rows.push(issueCard('note', 'فحوصات مياه ناقصة', `تقرير ${esc(core().displayDate(item.report.reportDate))} ينقصه ${item.missing.length} حقل/حقول فحص.`, item.report.id));
    });

    return rows.join('') || '<div class="audit-clean">لا توجد أخطاء حرجة أو مشاكل مراجعة ظاهرة في الفحص الحالي.</div>';
  }

  function summaryHtml(audit) {
    return `<div class="audit-summary-grid">
      <article class="audit-summary-card critical"><span>أخطاء حرجة</span><strong>${audit.criticalCount}</strong></article>
      <article class="audit-summary-card review"><span>تحتاج مراجعة</span><strong>${audit.reviewCount}</strong></article>
      <article class="audit-summary-card note"><span>ملاحظات</span><strong>${audit.noteCount}</strong></article>
    </div>`;
  }

  function open() {
    if (!core()?.auditReports) return;
    document.getElementById('dataAuditModal')?.remove();
    const reports = window.__WATER_REPORTS_CACHE__ || state.reports || [];
    const audit = core().auditReports(reports, window.WaterFuelRawEntries || []);
    document.body.insertAdjacentHTML('beforeend', `<div id="dataAuditModal" class="audit-modal open" dir="rtl">
      <div class="audit-backdrop" onclick="WaterDataAudit.close()"></div>
      <section class="audit-panel">
        <button class="close" onclick="WaterDataAudit.close()">×</button>
        <div class="audit-head"><div><p class="eyebrow">فحص داخلي</p><h2>فحص البيانات قبل العرض</h2><small>هذه الصفحة للإدارة فقط، لا تحذف أي بيانات تلقائيًا.</small></div></div>
        ${summaryHtml(audit)}
        <div class="audit-list">${renderList(audit)}</div>
      </section>
    </div>`);
  }

  function close() {
    document.getElementById('dataAuditModal')?.remove();
  }

  function patchReportsCache() {
    if (!window.FirebaseService || window.FirebaseService.__auditCachePatched) return;
    const original = window.FirebaseService.listenReports;
    window.FirebaseService.listenReports = function patchedListenReports(callback) {
      return original(function reportsWithAuditCache(reports) {
        state.reports = reports || [];
        window.__WATER_REPORTS_CACHE__ = state.reports;
        callback(reports);
        setTimeout(injectButton, 80);
      });
    };
    window.FirebaseService.__auditCachePatched = true;
  }

  function observe() {
    patchReportsCache();
    injectButton();
    const observer = new MutationObserver(injectButton);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.WaterDataAudit = { open, close, injectButton };
  window.addEventListener('DOMContentLoaded', observe);
})();
