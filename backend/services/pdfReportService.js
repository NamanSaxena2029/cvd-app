const PDFDocument = require('pdfkit');

const OFFICIAL_STATUS_LABEL = {
  normal_range: 'Normal-range screening result',
  borderline: 'Borderline screening result',
  deficient_range: 'Pattern consistent with possible red-green colour vision deficiency',
  insufficient_data: 'Insufficient data for an official-rule screening result',
};

function generateReportPdf(result, user) {
  const doc = new PDFDocument({ margin: 50 });
  const official = result.officialScreening || {};

  doc.fontSize(18).fillColor('#1e3a5f').text('Color Vision Screening Report', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#555').text('Ishihara-Based Preliminary Screening Tool', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(11).fillColor('#000');
  doc.text(`Test ID: ${result._id}`);
  doc.text(`Date: ${new Date(result.completedAt).toLocaleString()}`);
  doc.text(`User: ${user && user.name ? user.name : 'Guest'}`);
  doc.moveDown(1);

  // ---- Official Ishihara-rule screening result -----------------------
  doc.fontSize(13).fillColor('#1e3a5f').text('Ishihara Screening Result (Official Scoring Rule)');
  doc.fontSize(11).fillColor('#000');
  doc.text(`Status: ${OFFICIAL_STATUS_LABEL[official.status] || official.status || 'Unavailable'}`);
  if (official.presentedCount != null && official.fullOfficialSetSize != null) {
    doc.text(
      `Official screening plates presented: ${official.presentedCount} of ${official.fullOfficialSetSize}` +
        (official.normalReadCount != null ? ` (read normally: ${official.normalReadCount})` : '')
    );
  }
  if (official.subtype && official.subtype.label) {
    doc.text(`Subtype pattern: ${official.subtype.label}`);
  }
  if (official.note) {
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#333').text(official.note, { width: 480 });
    doc.fontSize(11).fillColor('#000');
  }
  if (official.scoringRuleSource) {
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#888').text(`Scoring rule source: ${official.scoringRuleSource}`, { width: 480 });
    doc.fontSize(11).fillColor('#000');
  }
  doc.moveDown(1);

  // ---- This application's own project-level experiment metrics --------
  doc.fontSize(13).fillColor('#1e3a5f').text("This Application's Timed-Response Experiment (Not the Official Ishihara Procedure)");
  doc.fontSize(11).fillColor('#000');
  doc.text(`Total Questions: ${result.totalQuestions}`);
  doc.text(`Correct (read as a normal-vision person would): ${result.correctCount}`);
  doc.text(`Incorrect: ${result.incorrectCount}`);
  doc.text(`Timeouts: ${result.timeoutCount}`);
  doc.text(`Overall Accuracy: ${Math.round((result.overallAccuracy || 0) * 100)}%`);
  doc.moveDown(0.5);
  (result.roundStats || []).forEach((r) => {
    doc.text(`Round ${r.round}: ${r.correct}/${r.total} correct (${Math.round((r.accuracy || 0) * 100)}%)`);
  });
  doc.moveDown(1);

  // ---- Explanation ------------------------------------------------------
  doc.fontSize(13).fillColor('#1e3a5f').text('Summary');
  doc.fontSize(11).fillColor('#000');
  doc.text(result.explanation || '', { width: 480 });
  doc.moveDown(1.5);

  // ---- Disclaimer ---------------------------------------------------------
  doc.fontSize(9).fillColor('#888');
  doc.text('Disclaimer', { underline: true });
  doc.text(result.disclaimer || '', { width: 480 });
  doc.moveDown(0.5);
  doc.text(
    'This document is a preliminary self-screening summary and is not an official medical ' +
      'certificate or clinical diagnostic report. The "Timed-Response Experiment" figures above are ' +
      "this application's own project-level metric and are not part of the standardized Ishihara " +
      'test procedure.',
    { width: 480 }
  );

  doc.end();
  return doc;
}

module.exports = { generateReportPdf };