window.AppUI = (() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
  const date = value => window.ReportParser.displayDate(value);

  function whatsappText(report) {
    const rows = (report.beneficiaries || []).map(item => `▪️ ${item.name}\nالكمية/ ${item.quantity} كوب ، عدد السيارات/ ${item.cars}`).join('\n\n');
    return `*${report.title}*\n\n⏱️ ساعة تشغيل المولد: ${report.generatorStart || '-'}\n⏹️ ساعة الإيقاف: ${report.generatorEnd || '-'}\n⏳ ساعات التشغيل: ${report.runHours || '-'} ساعات\n\n⛽ استهلاك الوقود:\n▪️ إجمالي الوقود المضاف يومياً: ${report.fuelAdded || '_'} لتر\n▪️ إجمالي الوقود المستهلك يومياً: ${report.fuelConsumed || '_'} لتر\n⛽️ إجمالي الوقود المورد من البلدية: ${report.fuelMunicipal || '_'}\n⛽️ إجمالي الوقود المتبقي: ${report.fuelBalance || '_'} لتر\n\n💧 كميات الضخ (بالكوب):\n▪️ كمية انتاج الغاطس: ${report.submersibleRate || '_'} كوب/ساعة\n▪️ كمية المياه بعد الفلترة: ${report.filteredRate || '_'} كوب/ساعة\n▪️ كمية العادم: ${report.wasteQuantity || '_'} كوب\n\n🧪 فحوصات المياه:\n▪️ درجة الحامضيه بعد التحلية Ph: ${report.phFiltered || '_'}\n▪️ درجة الحامضيه لمياه الغاطس Ph: ${report.phWell || '_'}\n▪️ تركيز الأملاح الذائبه (مياه محلاه) ${report.tdsFiltered || '_'} :TDS\n▪️ تركيز الأملاح الذائبه (بئر مياه) ${report.tdsWell || '_'} :TDS\n▪️ تركيز الأملاح الذائبه (عادم) ${report.tdsWaste || '_'}: TDS\n▪️ تركيز الكلور الحر: ${report.chlorine || '_'} مليجرام/لتر\n\n🚚 الإنتاج اليومي:\n${rows}\n\n▪️ إجمالي كمية المياه المعبأة: ${report.totalQuantity || 0} كوب\n▪️ إجمالي عدد السيارات: ${report.totalCars || 0} سيارة`;
  }

  function stats(reports) {
    return {
      count: reports.length,
      water: reports.reduce((sum, item) => sum + Number(item.totalQuantity || 0), 0),
      cars: reports.reduce((sum, item) => sum + Number(item.totalCars || 0), 0),
      fuel: reports.reduce((sum, item) => sum + Number(item.fuelConsumed || 0), 0)
    };
  }

  function card(report, activeId) {
    return `<button class="report-card ${report.id === activeId ? 'active' : ''}" onclick="App.select('${report.id}')">
      <span>${date(report.date)}</span>
      <strong>${escape(report.title)}</strong>
      <small>${report.totalQuantity || 0} كوب • ${report.totalCars || 0} سيارة • ${report.fuelConsumed || 0} لتر</small>
    </button>`;
  }

  function details(report) {
    if (!report) return `<section class="details empty-state"><div class="empty-icon">📄</div><h2>لا يوجد تقرير محدد</h2><p>اضغط تعبئة تلقائية والصق تقرير واتساب كامل.</p></section>`;
    const warnings = (report.warnings || []).length ? `<div class="notice warn"><strong>تنبيهات:</strong>${report.warnings.map(item => `<p>${escape(item)}</p>`).join('')}</div>` : '';
    return `<section class="details">
      <div class="section-head">
        <div><p class="eyebrow">معاينة التقرير</p><h2>${escape(report.title)}</h2></div>
        <div class="actions"><button class="btn primary" onclick="App.copyCurrent()">نسخ واتساب</button><button class="btn" onclick="window.print()">PDF</button><button class="btn danger" onclick="App.removeCurrent()">حذف</button></div>
      </div>
      ${warnings}
      <div class="report-preview">${escape(whatsappText(report))}</div>
    </section>`;
  }

  function modal() {
    return `<div id="smartModal" class="modal" aria-hidden="true">
      <div class="modal-backdrop" onclick="App.closeSmart()"></div>
      <div class="modal-panel">
        <button class="close" onclick="App.closeSmart()">×</button>
        <div class="modal-title"><span>⚡</span><div><h2>إضافة تقرير جديد</h2><p>الصق تقرير واتساب كما هو، ثم راجع النتيجة قبل الحفظ.</p></div></div>
        <textarea id="smartInput" class="smart-input" placeholder="الصق تقرير تشغيل وضخ المياه هنا..."></textarea>
        <div class="actions modal-actions"><button class="btn primary" onclick="App.analyzeSmart()">تحليل التقرير</button><button class="btn" onclick="App.clearSmartInput()">تفريغ</button></div>
        <div id="analysisResult" class="analysis"></div>
      </div>
    </div>`;
  }

  function analysis(report) {
    const warnings = (report.warnings || []).length ? `<div class="notice warn">${report.warnings.map(item => `<p>${escape(item)}</p>`).join('')}</div>` : `<div class="notice ok">تم تحليل التقرير بدون فروقات واضحة.</div>`;
    const rows = (report.beneficiaries || []).map(item => `<tr><td>${escape(item.name)}</td><td>${item.quantity}</td><td>${item.cars}</td></tr>`).join('');
    return `${warnings}<div class="analysis-grid">
      <div><span>التاريخ</span><strong>${date(report.date)}</strong></div><div><span>التشغيل</span><strong>${report.generatorStart || '-'}</strong></div><div><span>الإيقاف</span><strong>${report.generatorEnd || '-'}</strong></div><div><span>الساعات</span><strong>${report.runHours || '-'}</strong></div><div><span>الوقود</span><strong>${report.fuelConsumed || 0} لتر</strong></div><div><span>المياه</span><strong>${report.totalQuantity || 0} كوب</strong></div><div><span>السيارات</span><strong>${report.totalCars || 0}</strong></div><div><span>الجهات</span><strong>${(report.beneficiaries || []).length}</strong></div>
    </div><div class="table-wrap"><table><thead><tr><th>الجهة</th><th>الكمية</th><th>السيارات</th></tr></thead><tbody>${rows || '<tr><td colspan="3">لا توجد جهات مقروءة.</td></tr>'}</tbody></table></div><div class="actions modal-actions"><button class="btn primary" onclick="App.saveAnalyzed()">حفظ التقرير</button></div>`;
  }

  function layout(data) {
    const reports = data.reports || [];
    const active = reports.find(item => item.id === data.currentId) || reports[0];
    const s = stats(reports);
    const cards = reports.map(item => card(item, active?.id)).join('') || `<div class="empty-mini">لا توجد تقارير بعد.</div>`;
    return `<main class="app-shell">
      <header class="hero">
        <div class="hero-copy"><p class="eyebrow">لوحة صالح الدحنون</p><h1>نظام تقارير تشغيل وضخ المياه</h1><p>إدخال سريع من تقرير واتساب، حفظ كروت، معاينة رسمية، ونسخ جاهز للإرسال.</p></div>
        <div class="hero-actions"><button class="btn primary big" onclick="App.openSmart()">⚡ تعبئة تلقائية</button><button class="btn" onclick="App.exportExcel()">تصدير Excel</button><button class="btn ghost" onclick="App.clearAll()">مسح البيانات</button></div>
      </header>
      <section class="stats"><article><span>عدد التقارير</span><strong>${s.count}</strong></article><article><span>إجمالي المياه</span><strong>${s.water}</strong></article><article><span>عدد السيارات</span><strong>${s.cars}</strong></article><article><span>وقود مستهلك</span><strong>${s.fuel}</strong></article></section>
      <section class="workspace"><aside class="archive"><div class="section-head"><div><p class="eyebrow">الأرشيف</p><h2>كروت التقارير</h2></div></div><div class="cards">${cards}</div></aside>${details(active)}</section>${modal()}
    </main>`;
  }

  return { layout, analysis, whatsappText, escape };
})();
