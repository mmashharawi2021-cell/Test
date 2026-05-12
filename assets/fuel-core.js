window.WaterFuelCore = (() => {
  const TOLERANCE = 1;

  function number(value) {
    if (window.ReportUtils?.number) return window.ReportUtils.number(value);
    const n = Number(String(value ?? '').replace(',', '.').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function hasValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
  }

  function format(value, empty = '_') {
    const n = number(value);
    if (!n && empty) return empty;
    const r = +n.toFixed(2);
    return Number.isInteger(r) ? String(r) : String(r);
  }

  function formatSigned(value) {
    const n = number(value);
    const r = Number.isInteger(n) ? n : +n.toFixed(2);
    return `${r > 0 ? '+' : ''}${r}`;
  }

  function clean(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function displayDate(date) {
    return window.ReportUtils?.displayDate ? window.ReportUtils.displayDate(date) : String(date || '');
  }

  function normalizeEntry(entry = {}) {
    return {
      id: entry.id || '',
      day: entry.day || '',
      date: entry.date || '',
      time: entry.time || '',
      supplier: entry.supplier || entry.donor || '',
      quantityLiters: entry.quantityLiters ?? entry.quantity ?? '',
      fillingMethod: entry.fillingMethod || '',
      deliveredBy: entry.deliveredBy || '',
      notes: entry.notes || ''
    };
  }

  function entryKey(entry) {
    const e = normalizeEntry(entry);
    return [
      clean(e.date),
      clean(e.time),
      clean(e.supplier),
      format(e.quantityLiters, '0'),
      clean(e.fillingMethod),
      clean(e.deliveredBy)
    ].join('|');
  }

  function sortIncomingEntries(entries = []) {
    return [...entries].map(normalizeEntry).sort((a, b) => String(`${b.date || ''} ${b.time || ''}`).localeCompare(String(`${a.date || ''} ${a.time || ''}`)));
  }

  function splitUniqueIncoming(entries = []) {
    const seen = new Map();
    const unique = [];
    const duplicates = [];
    sortIncomingEntries(entries).forEach(entry => {
      const key = entryKey(entry);
      if (seen.has(key)) duplicates.push(entry);
      else {
        seen.set(key, entry.id);
        unique.push(entry);
      }
    });
    return { unique, duplicates };
  }

  function chronologicalReports(reports = []) {
    return [...reports].filter(report => report?.reportDate).sort((a, b) => String(a.reportDate || '').localeCompare(String(b.reportDate || '')));
  }

  function newestReports(reports = []) {
    return [...reports].filter(report => report?.reportDate).sort((a, b) => String(b.reportDate || '').localeCompare(String(a.reportDate || '')));
  }

  function latestStockReport(reports = []) {
    return newestReports(reports).find(report => hasValue(report?.fuel?.currentBalance)) || null;
  }

  function previousReportFor(reports = [], report) {
    if (!report?.reportDate) return null;
    return newestReports(reports)
      .filter(item => item.id !== report.id && item.reportDate && item.reportDate < report.reportDate && hasValue(item?.fuel?.currentBalance))[0] || null;
  }

  function getSummary(reports = [], incomingEntries = []) {
    const safeReports = reports || [];
    const { unique, duplicates } = splitUniqueIncoming(incomingEntries || window.WaterFuelRawEntries || []);
    const stockReport = latestStockReport(safeReports);
    const lastStock = stockReport ? number(stockReport.fuel?.currentBalance) : 0;
    const stockDate = stockReport?.reportDate || '';
    const consumedTotal = safeReports.reduce((sum, report) => sum + number(report?.fuel?.consumedDaily), 0);
    const incomingTotal = unique.reduce((sum, entry) => sum + number(entry.quantityLiters), 0);
    const reportAddedTotal = safeReports.reduce((sum, report) => sum + number(report?.fuel?.addedDaily) + number(report?.fuel?.municipalSupplied), 0);
    const lossTotal = safeReports.reduce((sum, report) => sum + number(report?.fuel?.loss), 0);
    const firstWithPrevious = chronologicalReports(safeReports).find(report => hasValue(report?.fuel?.previousBalance)) || null;
    const openingBalance = firstWithPrevious ? number(firstWithPrevious.fuel?.previousBalance) : 0;

    return {
      incomingEntries: unique,
      duplicateIncomingEntries: duplicates,
      incomingTotal,
      consumedTotal,
      reportAddedTotal,
      lossTotal,
      openingBalance,
      lastStock,
      stockDate,
      stockReport,
      reportCount: safeReports.length,
      // This is for internal audit only. It is intentionally not the main stock number.
      estimatedBalanceFromEntries: openingBalance + incomingTotal - consumedTotal - lossTotal
    };
  }

  function auditReports(reports = [], incomingEntries = []) {
    const sorted = chronologicalReports(reports);
    const fuelBalanceIssues = [];
    const fuelChainIssues = [];
    const duplicateDateReports = [];
    const duplicateIncoming = splitUniqueIncoming(incomingEntries || window.WaterFuelRawEntries || []).duplicates;
    const emptyConsumedReports = [];
    const waterOverProductionIssues = [];
    const missingTests = [];

    const byDate = new Map();
    sorted.forEach(report => {
      const date = report.reportDate || '';
      if (!date) return;
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push(report);
    });
    byDate.forEach((items, date) => {
      if (items.length > 1) duplicateDateReports.push({ date, count: items.length, reports: items });
    });

    sorted.forEach(report => {
      const f = report.fuel || {};
      const hasFuel = ['previousBalance', 'addedDaily', 'municipalSupplied', 'consumedDaily', 'currentBalance', 'loss'].some(key => hasValue(f[key]));
      if (hasFuel && !hasValue(f.consumedDaily)) emptyConsumedReports.push(report);
      if (hasFuel && hasValue(f.currentBalance)) {
        const expected = number(f.previousBalance) + number(f.addedDaily) + number(f.municipalSupplied) - number(f.consumedDaily) - number(f.loss);
        const actual = number(f.currentBalance);
        const diff = actual - expected;
        if (Math.abs(diff) > TOLERANCE) fuelBalanceIssues.push({ report, expected, actual, diff });
      }

      const previous = previousReportFor(sorted, report);
      if (previous && hasValue(report?.fuel?.previousBalance)) {
        const diff = number(report.fuel.previousBalance) - number(previous.fuel?.currentBalance);
        if (Math.abs(diff) > TOLERANCE) fuelChainIssues.push({ report, previous, diff });
      }

      const production = number(report?.water?.dailyProduction);
      const filled = number(report?.water?.filledWater);
      if (production && filled > production) waterOverProductionIssues.push({ report, production, filled, diff: filled - production });

      const t = report.tests || {};
      const requiredTests = ['phAfterDesalination', 'phWellWater', 'tdsDesalinated', 'tdsWell', 'tdsReject', 'freeChlorine'];
      const missing = requiredTests.filter(key => !hasValue(t[key]));
      if (missing.length) missingTests.push({ report, missing });
    });

    const criticalCount = fuelBalanceIssues.length + waterOverProductionIssues.length;
    const reviewCount = fuelChainIssues.length + duplicateDateReports.length + emptyConsumedReports.length + duplicateIncoming.length;
    const noteCount = missingTests.length;

    return {
      criticalCount,
      reviewCount,
      noteCount,
      isClean: criticalCount === 0 && reviewCount === 0,
      fuelBalanceIssues,
      fuelChainIssues,
      duplicateDateReports,
      duplicateIncoming,
      emptyConsumedReports,
      waterOverProductionIssues,
      missingTests
    };
  }

  return {
    TOLERANCE,
    number,
    hasValue,
    format,
    formatSigned,
    displayDate,
    normalizeEntry,
    entryKey,
    sortIncomingEntries,
    splitUniqueIncoming,
    latestStockReport,
    getSummary,
    auditReports
  };
})();
