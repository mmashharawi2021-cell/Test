window.App = (() => {
  const state = { reports: [], currentId: null, user: null, unsubscribe: null, editingId: null, draft: null };

  function setHtml(html) {
    document.getElementById('app').innerHTML = html;
    requestAnimationFrame(() => window.ThemeManager?.applyTheme(window.ThemeManager.current()));
  }

  function render() {
    setHtml(window.AppUI.layout(state));
  }

  function toast(message, type = 'ok') {
    const wrap = document.createElement('div');
    wrap.className = `toast-message ${type}`;
    wrap.textContent = message;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    setTimeout(() => {
      wrap.classList.remove('show');
      setTimeout(() => wrap.remove(), 220);
    }, 2600);
  }

  function confirmDialog({ title = 'تأكيد الإجراء', message = '', confirmText = 'تأكيد', cancelText = 'إلغاء', danger = false } = {}) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `<div class="confirm-card ${danger ? 'danger' : ''}"><div class="confirm-icon">${danger ? '⚠️' : '✅'}</div><h3>${window.AppUI.esc(title)}</h3><p>${window.AppUI.esc(message)}</p><div class="confirm-actions"><button class="btn ${danger ? 'danger' : 'primary'}" data-confirm="yes">${window.AppUI.esc(confirmText)}</button><button class="btn" data-confirm="no">${window.AppUI.esc(cancelText)}</button></div></div>`;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));
      const close = result => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 180);
        resolve(result);
      };
      overlay.addEventListener('click', event => {
        if (event.target === overlay) close(false);
        if (event.target?.dataset?.confirm === 'yes') close(true);
        if (event.target?.dataset?.confirm === 'no') close(false);
      });
    });
  }

  function start() {
    if (!window.FirebaseService.isConfigured) {
      setHtml(window.AppUI.login(false));
      return;
    }
    setHtml(window.AppUI.skeleton());
    window.FirebaseService.onAuth(user => {
      state.user = user;
      if (!user) {
        if (state.unsubscribe) state.unsubscribe();
        state.currentId = null;
        setHtml(window.AppUI.login(true));
        return;
      }
      window.ThemeManager?.loadUserTheme(user);
      window.FirebaseService.seedSettings().catch(console.warn);
      if (state.unsubscribe) state.unsubscribe();
      state.unsubscribe = window.FirebaseService.listenReports(reports => {
        state.reports = reports;
        if (state.currentId && !reports.some(item => item.id === state.currentId)) state.currentId = null;
        render();
      });
    });
  }

  async function login(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    try {
      setHtml(window.AppUI.skeleton());
      await window.FirebaseService.signIn(username, password);
      toast('تم تسجيل الدخول بنجاح', 'ok');
    } catch (error) {
      setHtml(window.AppUI.login(true));
      toast('بيانات الدخول غير صحيحة أو إعدادات Firebase غير مكتملة', 'warn');
    }
  }

  async function logout() {
    const ok = await confirmDialog({ title: 'تسجيل الخروج', message: 'هل تريد الخروج من النظام؟', confirmText: 'خروج', cancelText: 'بقاء' });
    if (!ok) return;
    await window.FirebaseService.signOut();
    toast('تم تسجيل الخروج', 'ok');
  }

  function select(id) {
    state.currentId = id;
    render();
    requestAnimationFrame(() => {
      document.getElementById('reportDetails')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function openNew() {
    state.editingId = null;
    state.draft = window.ReportUtils.emptyReport();
    openModalWithDraft();
  }

  function openEdit(id) {
    const report = state.reports.find(item => item.id === id);
    if (!report) return;
    state.editingId = id;
    state.draft = window.ReportUtils.recalc(report);
    openModalWithDraft();
  }

  function openModalWithDraft() {
    render();
    const modal = document.getElementById('reportModal');
    const host = document.getElementById('formHost');
    if (!modal || !host) return;
    host.innerHTML = window.AppUI.reportForm(state.draft);
    modal.classList.add('open');
    bindTabs();
  }

  function closeModal() {
    const modal = document.getElementById('reportModal');
    if (modal) modal.classList.remove('open');
  }

  function togglePaste() {
    document.getElementById('pasteText')?.classList.toggle('hidden');
    document.getElementById('parseBtn')?.classList.toggle('hidden');
  }

  function parseText() {
    const host = document.getElementById('formHost');
    const paste = document.getElementById('pasteText');
    try {
      const text = paste?.value || '';
      if (!text.trim()) {
        toast('الصق نص التقرير أولًا', 'warn');
        return;
      }
      const parsed = window.ReportParser.parse(text);
      state.draft = window.ReportUtils.fromParsed(parsed);
      const warnings = state.draft.warnings?.length
        ? `<div class="notice warn"><strong>تنبيهات التحليل:</strong>${state.draft.warnings.map(w => `<p>${window.AppUI.esc(w)}</p>`).join('')}</div>`
        : '';
      const info = `<div class="notice ok"><p>تم تحليل النص وملء الحقول.</p><p>التاريخ: ${window.ReportUtils.displayDate(state.draft.reportDate)} | الجهات: ${(state.draft.beneficiaries || []).length} | المياه: ${state.draft.water.filledWater || 0} كوب | السيارات: ${state.draft.water.carsCount || 0}</p></div>`;
      host.innerHTML = info + warnings + window.AppUI.reportForm(state.draft);
      bindTabs();
      document.querySelector('[data-tab="general"]')?.click();
      host.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('تم تحليل التقرير وملء الحقول', 'ok');
    } catch (error) {
      const message = error?.message || 'تعذر تحليل النص.';
      if (host) host.insertAdjacentHTML('afterbegin', `<div class="notice warn"><p>${window.AppUI.esc(message)}</p></div>`);
      toast(message, 'warn');
      console.error(error);
    }
  }

  function bindTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', event => {
        event.preventDefault();
        const id = tab.dataset.tab;
        document.querySelectorAll('.tab').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(item => item.classList.remove('active'));
        tab.classList.add('active');
        document.querySelector(`[data-panel="${id}"]`)?.classList.add('active');
      });
    });
  }

  function collectForm() {
    const form = document.getElementById('reportForm');
    const data = new FormData(form);
    const beneficiaries = [...document.querySelectorAll('[data-b="name"]')].map(input => {
      const i = input.dataset.i;
      return {
        id: state.draft?.beneficiaries?.[i]?.id || `b-${Date.now()}-${i}`,
        name: input.value,
        quantity: document.querySelector(`[data-b="quantity"][data-i="${i}"]`)?.value || '',
        cars: document.querySelector(`[data-b="cars"][data-i="${i}"]`)?.value || '',
        notes: document.querySelector(`[data-b="notes"][data-i="${i}"]`)?.value || ''
      };
    }).filter(item => item.name || item.quantity || item.cars);

    const report = {
      ...(state.draft || window.ReportUtils.emptyReport()),
      title: data.get('title'),
      reportDate: data.get('reportDate'),
      stationName: data.get('stationName'),
      wellName: data.get('wellName'),
      operatorName: data.get('operatorName'),
      generalNotes: data.get('generalNotes'),
      generator: { periods: [{ startTime: data.get('generatorStart'), stopTime: data.get('generatorEnd'), runHours: data.get('totalRunHours') }], totalRunHours: data.get('totalRunHours'), status: data.get('generatorStatus'), operatorName: data.get('generatorOperator'), notes: data.get('generatorNotes'), extraFields: [] },
      fuel: { addedDaily: data.get('fuelAdded'), consumedDaily: data.get('fuelConsumed'), municipalSupplied: data.get('fuelMunicipal'), previousBalance: data.get('fuelPrevious'), currentBalance: data.get('fuelCurrent'), loss: data.get('fuelLoss'), notes: data.get('fuelNotes'), extraFields: [] },
      water: { dailyProduction: data.get('dailyProduction'), rejectWater: data.get('rejectWater'), lossPercentage: data.get('lossPercentage'), filledWater: data.get('filledWater'), carsCount: data.get('carsCount'), averagePerCar: data.get('averagePerCar'), notes: data.get('waterNotes') },
      tests: { phAfterDesalination: data.get('phAfter'), phWellWater: data.get('phWell'), tdsDesalinated: data.get('tdsFiltered'), tdsWell: data.get('tdsWell'), tdsReject: data.get('tdsReject'), freeChlorine: data.get('freeChlorine'), extraFields: [] },
      beneficiaries
    };
    return window.ReportUtils.recalc(report);
  }

  function addBeneficiary() {
    state.draft = collectSafeDraft();
    state.draft.beneficiaries.push({ id: `b-${Date.now()}`, name: '', quantity: '', cars: '', notes: '' });
    document.getElementById('formHost').innerHTML = window.AppUI.reportForm(state.draft);
    bindTabs();
    document.querySelector('[data-tab="beneficiaries"]')?.click();
  }

  async function removeBeneficiary(index) {
    const ok = await confirmDialog({ title: 'حذف جهة', message: 'سيتم حذف هذه الجهة من التقرير الحالي فقط.', confirmText: 'حذف', cancelText: 'إلغاء', danger: true });
    if (!ok) return;
    state.draft = collectSafeDraft();
    state.draft.beneficiaries.splice(index, 1);
    document.getElementById('formHost').innerHTML = window.AppUI.reportForm(state.draft);
    bindTabs();
    document.querySelector('[data-tab="beneficiaries"]')?.click();
    toast('تم حذف الجهة من النموذج', 'ok');
  }

  function collectSafeDraft() {
    try { return collectForm(); } catch { return state.draft || window.ReportUtils.emptyReport(); }
  }

  async function saveReport() {
    try {
      const report = collectForm();
      const ok = await confirmDialog({ title: state.editingId ? 'حفظ التعديل' : 'حفظ التقرير', message: 'هل تريد حفظ التقرير في قاعدة البيانات؟', confirmText: 'حفظ', cancelText: 'مراجعة' });
      if (!ok) return;
      const id = await window.FirebaseService.saveReport(report, state.user, state.editingId);
      state.currentId = id;
      closeModal();
      toast('تم حفظ التقرير بنجاح', 'ok');
    } catch (error) {
      toast('تعذر حفظ التقرير في Firestore', 'warn');
      console.error(error);
    }
  }

  async function deleteReport(id) {
    const ok = await confirmDialog({ title: 'حذف التقرير', message: 'سيتم حذف التقرير نهائيًا من قاعدة البيانات. هل أنت متأكد؟', confirmText: 'حذف نهائي', cancelText: 'إلغاء', danger: true });
    if (!ok) return;
    try {
      await window.FirebaseService.deleteReport(id, state.user);
      state.currentId = null;
      toast('تم حذف التقرير', 'ok');
    } catch (error) {
      toast('تعذر حذف التقرير', 'warn');
      console.error(error);
    }
  }

  async function copyWhatsApp(id) {
    const report = state.reports.find(item => item.id === id);
    if (!report) return;
    const text = window.ReportUtils.whatsappText(report);
    await navigator.clipboard.writeText(text);
    toast('تم نسخ نص التقرير وفتح واتساب', 'ok');
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  function exportPdf(id) {
    const report = state.reports.find(item => item.id === id);
    if (!report) return;
    const w = window.open('', '_blank');
    w.document.write(`<html lang="ar" dir="rtl"><head><title>${report.title}</title><style>body{font-family:Tahoma,Arial;direction:rtl;padding:32px;line-height:1.9}pre{white-space:pre-wrap;font-size:15px}.footer{margin-top:30px;color:#666;border-top:1px solid #ddd;padding-top:10px}</style></head><body><pre>${window.AppUI.esc(window.ReportUtils.whatsappText(report))}</pre><div class="footer">تم توليد التقرير: ${new Date().toLocaleString('ar')}</div><script>print()<\/script></body></html>`);
    w.document.close();
    toast('تم تجهيز ملف PDF للطباعة', 'ok');
  }

  function workbookForReports(reports) {
    const wb = XLSX.utils.book_new();
    const general = reports.map(r => ({ 'التاريخ': r.reportDate, 'العنوان': r.title, 'المحطة': r.stationName, 'البئر': r.wellName, 'المشغل': r.operatorName }));
    const generator = reports.map(r => ({ 'التاريخ': r.reportDate, 'البداية': r.generator?.periods?.[0]?.startTime, 'الإيقاف': r.generator?.periods?.[0]?.stopTime, 'الساعات': r.generator?.totalRunHours, 'الحالة': r.generator?.status }));
    const fuel = reports.map(r => ({ 'التاريخ': r.reportDate, 'مضاف': r.fuel?.addedDaily, 'مستهلك': r.fuel?.consumedDaily, 'مورد من البلدية': r.fuel?.municipalSupplied, 'رصيد سابق': r.fuel?.previousBalance, 'رصيد حالي': r.fuel?.currentBalance, 'فاقد': r.fuel?.loss }));
    const water = reports.map(r => ({ 'التاريخ': r.reportDate, 'الإنتاج': r.water?.dailyProduction, 'العادم': r.water?.rejectWater, 'نسبة الفاقد': r.water?.lossPercentage, 'المعبأ': r.water?.filledWater, 'السيارات': r.water?.carsCount, 'متوسط السيارة': r.water?.averagePerCar }));
    const tests = reports.map(r => ({ 'التاريخ': r.reportDate, 'PH بعد التحلية': r.tests?.phAfterDesalination, 'PH الغاطس': r.tests?.phWellWater, 'TDS محلاة': r.tests?.tdsDesalinated, 'TDS بئر': r.tests?.tdsWell, 'TDS عادم': r.tests?.tdsReject, 'الكلور الحر': r.tests?.freeChlorine }));
    const beneficiaries = reports.flatMap(r => (r.beneficiaries || []).map(b => ({ 'التاريخ': r.reportDate, 'الجهة': b.name, 'الكمية': b.quantity, 'السيارات': b.cars, 'ملاحظات': b.notes })));
    const s = window.ReportUtils.summary(reports);
    const summary = [{ 'إجمالي ساعات التشغيل': s.runHours, 'إجمالي الوقود المستهلك': s.fuelConsumed, 'إجمالي الوقود المورد': s.fuelSupplied, 'إجمالي الإنتاج': s.waterProduction, 'إجمالي العادم': s.rejectWater, 'إجمالي المعبأ': s.filledWater, 'إجمالي السيارات': s.cars, 'متوسط الإنتاج اليومي': s.averageDailyProduction, 'نسبة الفاقد': s.lossPercentage }];
    [['General', general], ['Generator', generator], ['Fuel', fuel], ['Water Quantities', water], ['Water Tests', tests], ['Beneficiaries', beneficiaries], ['Summary', summary]].forEach(([name, rows]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name));
    return wb;
  }

  function exportOneExcel(id) {
    const report = state.reports.find(item => item.id === id);
    if (!report) return;
    XLSX.writeFile(workbookForReports([report]), `${report.title}.xlsx`);
    toast('تم تصدير التقرير إلى Excel', 'ok');
  }

  function exportAllExcel() {
    XLSX.writeFile(workbookForReports(state.reports), 'تقارير تشغيل وضخ المياه.xlsx');
    toast('تم تصدير جميع التقارير إلى Excel', 'ok');
  }

  function openSummary() {
    const s = window.ReportUtils.summary(state.reports);
    confirmDialog({ title: 'ملخص التقارير', message: `ساعات التشغيل: ${s.runHours.toFixed(1)}\nالوقود المستهلك: ${s.fuelConsumed}\nالمياه المعبأة: ${s.filledWater}\nعدد السيارات: ${s.cars}\nنسبة الفاقد: ${s.lossPercentage}%`, confirmText: 'تم', cancelText: 'إغلاق' });
  }

  return { start, login, logout, render, select, openNew, openEdit, closeModal, togglePaste, parseText, addBeneficiary, removeBeneficiary, saveReport, deleteReport, copyWhatsApp, exportPdf, exportOneExcel, exportAllExcel, openSummary };
})();

window.addEventListener('DOMContentLoaded', () => window.App.start());
