const PDFDocument = require('pdfkit');

const BRAND_NAVY = '#1e3a5f';
const BRAND_BLUE = '#2f6fed';
const BRAND_BLUE_LIGHT = '#eef6ff';
const GREEN = '#25a86a';
const AMBER = '#d98a1f';
const RED = '#d1473f';
const GRAY = '#6b7280';
const LIGHT_GRAY = '#f4f5f7';

const OFFICIAL_STATUS_LABEL = {
  normal_range: 'Normal-range screening result',
  borderline: 'Borderline screening result',
  deficient_range: 'Pattern consistent with possible red-green colour vision deficiency',
  insufficient_data: 'Insufficient data for an official-rule screening result',
};

const STATUS_COLOR = {
  normal_range: GREEN,
  borderline: AMBER,
  deficient_range: RED,
  insufficient_data: GRAY,
};

// ─── Small drawing helpers ───────────────────────────────────────────────
function drawPieSlice(doc, cx, cy, r, startAngle, endAngle, color) {
  // startAngle/endAngle in radians, 0 = up, clockwise
  const steps = Math.max(2, Math.ceil(((endAngle - startAngle) * 180) / Math.PI / 3));
  doc.moveTo(cx, cy);
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + ((endAngle - startAngle) * i) / steps;
    const x = cx + r * Math.sin(a);
    const y = cy - r * Math.cos(a);
    doc.lineTo(x, y);
  }
  doc.closePath().fill(color);
}

function drawDonutChart(doc, cx, cy, r, innerR, segments) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let angle = 0;
  segments.forEach((seg) => {
    const sweep = (seg.value / total) * Math.PI * 2;
    if (seg.value > 0) drawPieSlice(doc, cx, cy, r, angle, angle + sweep, seg.color);
    angle += sweep;
  });
  // punch the donut hole with a page-colour circle on top
  doc.circle(cx, cy, innerR).fill('#ffffff');
}

function statBox(doc, x, y, w, h, label, value, color) {
  doc.roundedRect(x, y, w, h, 4).fill(LIGHT_GRAY);
  doc.fontSize(16).fillColor(color).text(String(value), x, y + 10, { width: w, align: 'center' });
  doc.fontSize(8).fillColor(GRAY).text(label.toUpperCase(), x, y + h - 18, {
    width: w,
    align: 'center',
    characterSpacing: 0.3,
  });
}

function legendRow(doc, x, y, color, label, value) {
  doc.rect(x, y + 2, 8, 8).fill(color);
  doc.fontSize(9).fillColor('#333').text(`${label}`, x + 14, y, { continued: false, width: 90 });
  doc.fontSize(9).fillColor('#333').text(`${value}`, x + 100, y, { width: 30, align: 'right' });
}

// ─── Main builder ─────────────────────────────────────────────────────────
function generateReportPdf(result, user) {
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
  const pageW = doc.page.width; // 595.28
  const marginX = 42;
  const contentW = pageW - marginX * 2;
  const official = result.officialScreening || {};
  const statusColor = STATUS_COLOR[official.status] || GRAY;
  const reportUser = (result.user && (result.user.name || result.user.email)) ? result.user : user;

  // ── Header band ─────────────────────────────────────────────────────
  doc.rect(0, 0, pageW, 86).fill(BRAND_NAVY);
  doc.fillColor('#ffffff').fontSize(20).text('ColorSight', marginX, 24);
  doc.fontSize(10).fillColor('#cfe0f5').text('Color Vision Screening Report — Ishihara-based preliminary tool', marginX, 50);
  doc.fontSize(8).fillColor('#9fb4d6').text(`Test ID: ${result._id}`, marginX, 66);
  doc.fontSize(8).fillColor('#9fb4d6').text(
    `Generated: ${new Date().toLocaleString()}`,
    marginX,
    66,
    { width: contentW, align: 'right' }
  );

  let y = 104;

  // ── User info + status badge row ───────────────────────────────────
  doc.roundedRect(marginX, y, contentW * 0.62, 56, 4).fill(LIGHT_GRAY);
  doc.fontSize(8).fillColor(GRAY).text('NAME', marginX + 14, y + 10);
  doc.fontSize(11).fillColor('#111').text(reportUser?.name || 'Guest', marginX + 14, y + 22);
  doc.fontSize(8).fillColor(GRAY).text('EMAIL', marginX + 14, y + 38);
  doc.fontSize(10).fillColor('#111').text(reportUser?.email || 'Not provided (guest session)', marginX + 14, y + 48, {
    width: contentW * 0.6 - 20,
  });

  const badgeX = marginX + contentW * 0.62 + 12;
  const badgeW = contentW * 0.38 - 12;
  doc.roundedRect(badgeX, y, badgeW, 56, 4).fill(statusColor);
  doc.fontSize(8).fillColor('#ffffff').opacity(0.85).text('SCREENING STATUS', badgeX + 12, y + 10);
  doc.opacity(1).fontSize(10.5).fillColor('#ffffff').text(OFFICIAL_STATUS_LABEL[official.status] || 'Unavailable', badgeX + 12, y + 22, {
    width: badgeW - 24,
  });
  if (official.subtype && official.subtype.label) {
    doc.fontSize(8).fillColor('#ffffff').opacity(0.85).text(official.subtype.label, badgeX + 12, y + 44, { width: badgeW - 24 });
    doc.opacity(1);
  }

  y += 72;

  // ── Section: overview stat boxes ───────────────────────────────────
  doc.fontSize(12).fillColor(BRAND_NAVY).text('Test summary', marginX, y);
  y += 18;

  const boxW = (contentW - 3 * 10) / 4;
  const boxH = 46;
  statBox(doc, marginX, y, boxW, boxH, 'Total questions', result.totalQuestions ?? '—', BRAND_NAVY);
  statBox(doc, marginX + (boxW + 10), y, boxW, boxH, 'Correct', result.correctCount ?? '—', GREEN);
  statBox(doc, marginX + 2 * (boxW + 10), y, boxW, boxH, 'Incorrect', result.incorrectCount ?? '—', RED);
  statBox(doc, marginX + 3 * (boxW + 10), y, boxW, boxH, 'Accuracy', `${Math.round((result.overallAccuracy || 0) * 100)}%`, BRAND_BLUE);

  y += boxH + 26;

  // ── Charts row: donut (left) + bar chart (right) ───────────────────
  const chartsTop = y;
  const donutCx = marginX + 78;
  const donutCy = chartsTop + 70;
  const donutR = 60;

  doc.fontSize(10).fillColor(BRAND_NAVY).text('Answer breakdown', marginX, chartsTop - 16);

  const segments = [
    { label: 'Correct', value: result.correctCount || 0, color: GREEN },
    { label: 'Incorrect', value: result.incorrectCount || 0, color: RED },
    { label: 'Timeout', value: result.timeoutCount || 0, color: AMBER },
  ];
  drawDonutChart(doc, donutCx, donutCy, donutR, donutR * 0.55, segments);
  doc.fontSize(13).fillColor('#111').text(`${Math.round((result.overallAccuracy || 0) * 100)}%`, donutCx - 30, donutCy - 8, {
    width: 60,
    align: 'center',
  });

  let legendY = donutCy + donutR + 16;
  segments.forEach((seg, i) => {
    legendRow(doc, marginX, legendY + i * 14, seg.color, seg.label, seg.value);
  });

  // Bar chart: per-round accuracy
  const barAreaX = marginX + 200;
  const barAreaW = contentW - 200;
  const barAreaTop = chartsTop;
  const barAreaH = 130;
  doc.fontSize(10).fillColor(BRAND_NAVY).text('Accuracy by round', barAreaX, barAreaTop - 16);

  // axis baseline
  doc
    .moveTo(barAreaX, barAreaTop + barAreaH)
    .lineTo(barAreaX + barAreaW, barAreaTop + barAreaH)
    .strokeColor('#d8dde3')
    .lineWidth(1)
    .stroke();

  const rounds = result.roundStats && result.roundStats.length ? result.roundStats : [];
  const barSlots = 3;
  const barGap = 28;
  const barW = 46;
  const usableW = barSlots * barW + (barSlots - 1) * barGap;
  const barsStartX = barAreaX + (barAreaW - usableW) / 2;

  for (let i = 0; i < barSlots; i++) {
    const r = rounds[i];
    const acc = r ? Math.round((r.accuracy || 0) * 100) : 0;
    const bx = barsStartX + i * (barW + barGap);
    const maxBarH = barAreaH - 20;
    const bh = Math.max(2, (acc / 100) * maxBarH);
    const by = barAreaTop + barAreaH - bh;
    const color = acc >= 80 ? GREEN : acc >= 50 ? AMBER : RED;

    doc.roundedRect(bx, by, barW, bh, 3).fill(color);
    doc.fontSize(9).fillColor('#111').text(`${acc}%`, bx, by - 14, { width: barW, align: 'center' });
    doc.fontSize(8).fillColor(GRAY).text(`Round ${i + 1}`, bx, barAreaTop + barAreaH + 6, { width: barW, align: 'center' });
    if (r) {
      doc.fontSize(7).fillColor(GRAY).text(`${r.correct}/${r.total}`, bx, barAreaTop + barAreaH + 18, { width: barW, align: 'center' });
    }
  }

  y = chartsTop + Math.max(donutR * 2 + 16 + segments.length * 14, barAreaH + 34) + 20;

  // ── Explanation (short) ─────────────────────────────────────────────
  doc.fontSize(11).fillColor(BRAND_NAVY).text('Summary', marginX, y);
  y += 14;
  doc.fontSize(9).fillColor('#333').text(result.explanation || '', marginX, y, { width: contentW, align: 'justify' });
  y = doc.y + 20;

  // ── Official Ishihara scoring detail ─────────────────────────────────
  doc.fontSize(11).fillColor(BRAND_NAVY).text('Ishihara official scoring rule', marginX, y);
  y += 16;
  doc.roundedRect(marginX, y, contentW, 74, 4).fill(BRAND_BLUE_LIGHT);
  const colW = contentW / 3;
  doc.fontSize(8).fillColor(GRAY).text('OFFICIAL PLATES PRESENTED', marginX + 14, y + 12);
  doc.fontSize(12).fillColor('#111').text(
    official.presentedCount != null && official.fullOfficialSetSize != null
      ? `${official.presentedCount} / ${official.fullOfficialSetSize}`
      : '—',
    marginX + 14,
    y + 25
  );
  doc.fontSize(8).fillColor(GRAY).text('READ NORMALLY', marginX + 14 + colW, y + 12);
  doc.fontSize(12).fillColor('#111').text(official.normalReadCount != null ? String(official.normalReadCount) : '—', marginX + 14 + colW, y + 25);
  doc.fontSize(8).fillColor(GRAY).text('SUBTYPE PATTERN', marginX + 14 + colW * 2, y + 12);
  doc.fontSize(11).fillColor('#111').text(official.subtype?.label || 'Not applicable', marginX + 14 + colW * 2, y + 25, { width: colW - 20 });
  if (official.note) {
    doc.fontSize(8).fillColor('#333').text(official.note, marginX + 14, y + 48, { width: contentW - 28 });
  }
  y += 74 + 10;
  if (official.scoringRuleSource) {
    doc.fontSize(7).fillColor(GRAY).text(`Scoring rule source: ${official.scoringRuleSource}`, marginX, y);
  }

  // ── Disclaimer (small, fixed near bottom) ───────────────────────────
  const footerY = 780;
  doc
    .moveTo(marginX, footerY - 10)
    .lineTo(pageW - marginX, footerY - 10)
    .strokeColor('#e5e7eb')
    .lineWidth(0.5)
    .stroke();
  doc.fontSize(7).fillColor(GRAY).text(
    'This document is a preliminary self-screening summary and is not an official medical certificate or clinical diagnostic report. ' +
      "The timed-response experiment figures above are this application's own project-level metric and are not part of the standardized Ishihara test procedure.",
    marginX,
    footerY,
    { width: contentW, align: 'justify' }
  );

  doc.fontSize(7).fillColor(GRAY).text('ColorSight — generated report', marginX, 812, { width: contentW, align: 'center' });

  doc.end();
  return doc;
}

module.exports = { generateReportPdf };