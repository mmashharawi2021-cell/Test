(() => {
  const state = { open: false, reports: [], filter: 'all' };

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

  function typeLabel(type) {
    return ({ critical: 'خطأ حرج', review: 'مراجعة', note: 'ملاحظة' }[type] || 'فحص');
  }

  function issueCard(type, title, body, reportId = '', extra = '') {
    const action = reportId ? `<button class="mini" onclick="App.select('${esc(reportId)}'); WaterDataAudit.close();">فتح التقرير</button>` : '';
    return `<article class="audit-issue ${type}" data-audit-type="${type}">
      <div><span class="audit-type-chip">${typeLabel(type)}</span><strong>${esc(title)}</strong><p>${body}</p>${extra}</div>
      ${action}
    </article>`;
  }

  function issueData(audit) {
    const rows = [];
    audit.fuelBalanceIssues.forEach(item => {
      rows.push({ type: 'critical', html: issueCard('critical', 'خطأ في رصيد الوقود', `تقرير ${esc(core().displayDate(item.report.reportDate))}: الرصيد المتوقع ${esc(core().format(item.expected, '0'))} لتر، المسجل ${esc(core().format(item.actual, '0'))} لتر، الفرق ${esc(core().formatSigned(item.diff))} لتر.`, item.report.id) });
    });
    audit.waterOverProductionIssues.forEach(item => {
      rows.push({ type: 'critical', html: issueCard('critical', 'المياه المعبأة أكبر من الإنتاج', `تقرير ${esc(core().displayDate(item.report.reportDate))}: الإنتاج ${esc(core().format(item.production, '0'))} كوب، المعبأ ${esc(core().format(item.filled, '0'))} كوب، الفرق ${esc(core().format(item.diff, '0'))} كوب.`, item.report.id) });
    });
    audit.fuelChainIssues.forEach(item => {
      rows.push({ type: 'review', html: issueCard('review', 'الرصيد السابق لا يطابق التقرير السابق', `تقرير ${esc(core().displayDate(item.report.reportDate))} يختلف عن رصيد ${esc(core().displayDate(item.previous.reportDate))} بفارق ${esc(core().formatSigned(item.diff))} لتر.`, item.report.id) });
    });
    audit.duplicateDateReports.forEach(item => {
      rows.push({ type: 'review', html: issueCard('review', 'أكثر من تقرير بنفس التاريخ', `التاريخ ${esc(core().displayDate(item.date))} يحتوي ${item.count} تقارير. راجع إن كان هذا مقصودًا.`) });
    });
    audit.emptyConsumedReports.forEach(report => {
      rows.push({ type: 'review', html: issueCard('review', 'استهلاك وقود فارغ', `تقرير ${esc(core().displayDate(report.reportDate))} يحتوي بيانات وقود لكن الاستهلاك فارغ.`, report.id) });
    });
    audit.duplicateIncoming.forEach(entry => {
      const cleanup = window.WaterFuel?.cleanupDuplicateFuelEntries ? '<button class="mini warning" onclick="WaterFuel.cleanupDuplicateFuelEntries(); WaterDataAudit.close();">فتح تنظيف المكرر</button>' : '';
      rows.push({ type: 'review', html: issueCard('review', 'سجل وقود وارد مكرر', `سجل بتاريخ ${esc(core().displayDate(entry.date))}، كمية ${esc(core().format(entry.quantityLiters, '0'))} لتر، المورد ${esc(entry.supplier || '-')}.`, '', cleanup) });
    });
    audit.missingTests.forEach(item => {
      rows.push({ type: 'note', html: issueCard('note', 'فحوصات مياه ناقصة', `تقرير ${esc(core().displayDate(item.report.reportDate))} ينقصه ${item.missing.length} حقل/حقول فحص.`, item.report.id) });
    });
    return rows;
  }

  function renderList(audit) {
    const rows = issueData(audit).filter(item => state.filter === 'all' || item.type === state.filter);
    return rows.map(item => item.html).join('') || '<div class="audit-clean">لا توجد عناصر ضمن هذا الفلتر.</div>';
  }

  function summaryHtml(audit) {
    const active = filter => state.filter === filter ? 'active' : '';
    return `<div class="audit-summary-grid">
      <button class="audit-summary-card all ${active('all')}" onclick="WaterDataAudit.setFilter('all')"><span>الكل</span><strong>${audit.criticalCount + audit.reviewCount + audit.noteCount}</strong></button>
      <button class="audit-summary-card critical ${active('critical')}" onclick="WaterDataAudit.setFilter('critical')"><span>أخطاء حرجة</span><strong>${audit.criticalCount}</strong></button>
      <button class="audit-summary-card review ${active('review')}" onclick="WaterDataAudit.setFilter('review')"><span>تحتاج مراجعة</span><strong>${audit.reviewCount}</strong></button>
      <button class="audit-summary-card note ${active('note')}" onclick="WaterDataAudit.setFilter('note')"><span>ملاحظات</span><strong>${audit.noteCount}</strong></button>
    </div>`;
  }

  function guidanceHtml(audit) {
    if (audit.criticalCount) {
      return `<div class="audit-guidance danger"><strong>الأولوية الآن:</strong><p>لا تعرض صفحة الفحص أمام البلدية. صحح الأخطاء الحرجة أولًا من زر فتح التقرير، خصوصًا رصيد الوقود والمياه المعبأة أكبر من الإنتاج.</p></div>`;
    }
    if (audit.reviewCount) {
      return `<div class="audit-guidance warn"><strong>الحالة مقبولة بشروط:</strong><p>لا توجد أخطاء حرجة، لكن توجد عناصر تحتاج مراجعة قبل اعتماد البيانات النهائية.</p></div>`;
    }
    return `<div class="audit-guidance ok"><strong>الحالة جيدة:</strong><p>لا توجد أخطاء حرجة أو عناصر مراجعة في الفحص الحالي.</p></div>`;
  }

  function renderPanel() {
    if (!core()?.auditReports) return;
    const modal = document.getElementById('dataAuditModal');
    if (!modal) return;
    const reports = window.__WATER_REPORTS_CACHE__ || state.reports || [];
    const audit = core().auditReports(reports, window.WaterFuelRawEntries || []);
    modal.querySelector('.audit-content').innerHTML = `
      <div class="audit-head"><div><p class="eyebrow">فحص داخلي</p><h2>فحص البيانات قبل العرض</h2><small>هذه الصفحة للإدارة فقط، لا تحذف أي بيانات تلقائيًا.</small></div></div>
      ${summaryHtml(audit)}
      ${guidanceHtml(audit)}
      <div class="audit-list">${renderList(audit)}</div>
    `;
  }

  function open() {
    if (!core()?.auditReports) return;
    document.getElementById('dataAuditModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div id="dataAuditModal" class="audit-modal open" dir="rtl">
      <div class="audit-backdrop" onclick="WaterDataAudit.close()"></div>
      <section class="audit-panel">
        <button class="close" onclick="WaterDataAudit.close()">×</button>
        <div class="audit-content"></div>
      </section>
    </div>`);
    renderPanel();
  }

  function close() {
    document.getElementById('dataAuditModal')?.remove();
  }

  function setFilter(filter) {
    state.filter = filter || 'all';
    renderPanel();
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

  window.WaterDataAudit = { open, close, setFilter, injectButton };
  window.addEventListener('DOMContentLoaded', observe);
})();
