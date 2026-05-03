(() => {
  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  }

  function safeFileName(name) {
    return String(name || 'water-report').replace(/[\\/:*?"<>|]/g, '-').slice(0, 80);
  }

  function getReports() {
    const cards = [...document.querySelectorAll('.report-card')];
    if (window.__WATER_REPORTS_CACHE__) return window.__WATER_REPORTS_CACHE__;
    return [];
  }

  function normalizeReport(report) {
    return window.ReportUtils.recalc(structuredClone(report || {}));
  }

  function rowsForReports(reports) {
    const list = (reports || []).map(normalizeReport);
    const summary = list.map(r => ({
      'التاريخ': window.ReportUtils.displayDate(r.reportDate),
      'العنوان': r.title || '',
      'المحطة': r.stationName || '',
      'البئر': r.wellName || '',
      'المشغل': r.operatorName || r.generator?.operatorName || '',
      'بداية التشغيل': window.ReportUtils.displayTimeArabic?.(r.generator?.periods?.[0]?.startTime) || r.generator?.periods?.[0]?.startTime || '',
      'وقت الإيقاف': window.ReportUtils.displayTimeArabic?.(r.generator?.periods?.[0]?.stopTime) || r.generator?.periods?.[0]?.stopTime || '',
      'ساعات التشغيل': r.generator?.totalRunHours || '',
      'حالة المولد': r.generator?.status || '',
      'الوقود المضاف': r.fuel?.addedDaily || '',
      'الوقود المستهلك': r.fuel?.consumedDaily || '',
      'المورد من البلدية': r.fuel?.municipalSupplied || '',
      'الرصيد السابق': r.fuel?.previousBalance || '',
      'الرصيد الحالي': r.fuel?.currentBalance || '',
      'فاقد الوقود': r.fuel?.loss || '',
      'إنتاج الغاطس كوب/ساعة': r.water?.submersibleRate || '',
      'بعد الفلترة كوب/ساعة': r.water?.filteredRate || '',
      'الإنتاج اليومي': r.water?.dailyProduction || '',
      'العادم': r.water?.rejectWater || '',
      'نسبة الفاقد': r.water?.lossPercentage || '',
      'المياه المعبأة': r.water?.filledWater || '',
      'عدد السيارات': r.water?.carsCount || '',
      'متوسط السيارة': r.water?.averagePerCar || '',
      'PH بعد التحلية': r.tests?.phAfterDesalination || '',
      'PH الغاطس': r.tests?.phWellWater || '',
      'TDS محلاة': r.tests?.tdsDesalinated || '',
      'TDS بئر': r.tests?.tdsWell || '',
      'TDS عادم': r.tests?.tdsReject || '',
      'الكلور الحر': r.tests?.freeChlorine || '',
      'عدد التنبيهات': (r.warnings || []).length,
      'الملاحظات': r.generalNotes || r.notes || ''
    }));

    const beneficiaries = list.flatMap(r => (r.beneficiaries || []).map(b => ({
      'تاريخ التقرير': window.ReportUtils.displayDate(r.reportDate),
      'عنوان التقرير': r.title || '',
      'الجهة المستفيدة': b.name || '',
      'الكمية كوب': b.quantity || 0,
      'عدد السيارات': b.cars || 0,
      'ملاحظات': b.notes || ''
    })));

    const tests = list.map(r => ({
      'التاريخ': window.ReportUtils.displayDate(r.reportDate),
      'PH بعد التحلية': r.tests?.phAfterDesalination || '',
      'PH مياه الغاطس': r.tests?.phWellWater || '',
      'TDS مياه محلاة': r.tests?.tdsDesalinated || '',
      'TDS بئر': r.tests?.tdsWell || '',
      'TDS عادم': r.tests?.tdsReject || '',
      'الكلور الحر': r.tests?.freeChlorine || ''
    }));

    const totals = window.ReportUtils.summary(list);
    const totalsRows = [{
      'عدد التقارير': list.length,
      'إجمالي ساعات التشغيل': totals.runHours,
      'إجمالي الوقود المستهلك': totals.fuelConsumed,
      'إجمالي الوقود المورد': totals.fuelSupplied,
      'إجمالي الإنتاج': totals.waterProduction,
      'إجمالي العادم': totals.rejectWater,
      'إجمالي المعبأ': totals.filledWater,
      'إجمالي السيارات': totals.cars,
      'متوسط الإنتاج اليومي': totals.averageDailyProduction,
      'متوسط الوقود': totals.averageFuelConsumption,
      'نسبة الفاقد': totals.lossPercentage
    }];

    return { summary, beneficiaries, tests, totalsRows };
  }

  function autoFit(ws, rows) {
    const cols = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.min(Math.max(key.length, ...rows.map(row => String(row[key] ?? '').length)) + 2, 38)
    }));
    ws['!cols'] = cols;
    ws['!dir'] = 'rtl';
  }

  function exportXlsx(reports, filename = 'تقارير تشغيل وضخ المياه.xlsx') {
    if (!window.XLSX) throw new Error('مكتبة Excel لم يتم تحميلها.');
    const { summary, beneficiaries, tests, totalsRows } = rowsForReports(reports);
    const wb = XLSX.utils.book_new();
    [
      ['ملخص التقارير', summary],
      ['الجهات المستفيدة', beneficiaries.length ? beneficiaries : [{ 'ملاحظة': 'لا توجد جهات' }]],
      ['فحوصات المياه', tests],
      ['الإجماليات', totalsRows]
    ].forEach(([name, rows]) => {
      const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
      autoFit(ws, rows);
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    });
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.writeFile(wb, safeFileName(filename));
  }

  function toCsv(rows) {
    const headers = Object.keys(rows[0] || {});
    const clean = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    return '\ufeff' + [headers.map(clean).join(','), ...rows.map(row => headers.map(h => clean(row[h])).join(','))].join('\n');
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFileName(filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportCsv(reports, filename = 'تقارير تشغيل وضخ المياه.csv') {
    const rows = rowsForReports(reports).summary;
    downloadBlob(toCsv(rows), filename, 'text/csv;charset=utf-8');
  }

  function exportHtml(reports, filename = 'تقرير تشغيل وضخ المياه.html') {
    const rows = rowsForReports(reports).summary;
    const headers = Object.keys(rows[0] || {});
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير تشغيل وضخ المياه</title><style>body{font-family:Tahoma,Arial;padding:24px;direction:rtl}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:8px;text-align:right}th{background:#e8f5ef}</style></head><body><h1>تقرير تشغيل وضخ المياه</h1><table><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map(h => `<td>${esc(row[h])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
    downloadBlob(html, filename, 'text/html;charset=utf-8');
  }

  function openExportDialog(reports, title = 'تصدير التقرير') {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay export-overlay show';
    overlay.innerHTML = `<div class="confirm-card export-card"><div class="confirm-icon">📤</div><h3>${esc(title)}</h3><p>اختر طريقة التصدير المناسبة. Excel الأساسي تم إصلاحه، وCSV/HTML بدائل آمنة إذا منع المتصفح تحميل Excel.</p><div class="export-actions"><button class="btn primary" data-export="xlsx">📊 Excel XLSX</button><button class="btn" data-export="csv">📄 CSV</button><button class="btn" data-export="html">🌐 HTML قابل للفتح</button><button class="btn" data-export="copy">📋 نسخ النص</button><button class="btn" data-export="close">إغلاق</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', async event => {
      const action = event.target?.dataset?.export;
      if (!action && event.target !== overlay) return;
      try {
        if (event.target === overlay || action === 'close') return overlay.remove();
        if (action === 'xlsx') exportXlsx(reports, reports.length === 1 ? `${reports[0].title}.xlsx` : 'تقارير تشغيل وضخ المياه.xlsx');
        if (action === 'csv') exportCsv(reports, reports.length === 1 ? `${reports[0].title}.csv` : 'تقارير تشغيل وضخ المياه.csv');
        if (action === 'html') exportHtml(reports, reports.length === 1 ? `${reports[0].title}.html` : 'تقارير تشغيل وضخ المياه.html');
        if (action === 'copy') await navigator.clipboard.writeText(reports.map(r => window.ReportUtils.whatsappText(r)).join('\n\n----------------\n\n'));
        overlay.remove();
      } catch (error) {
        alert(`فشل التصدير: ${error.message}`);
      }
    });
  }

  window.ExportTools = { exportXlsx, exportCsv, exportHtml, openExportDialog, rowsForReports };
})();
