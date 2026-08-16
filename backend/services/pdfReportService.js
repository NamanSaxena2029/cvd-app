const PDFDocument = require('pdfkit');

function generateReportPdf(result, user) {
  const doc = new PDFDocument({ margin: 50 });

  doc.fontSize(18).fillColor('#1e3a5f').text('Color Vision Screening Report', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#555').text('Ishihara-Based Preliminary Screening Tool', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(11).fillColor('#000');
  doc.text(`Test ID: ${result._id}`);
  doc.text(`Date: ${new Date(result.completedAt).toLocaleString()}`);
  doc.text(`User: ${user && user.name ? user.name : 'Guest'}`);
  doc.moveDown(1);

  doc.fontSize(13).fillColor('#1e3a5f').text('Overall Result');
  doc.fontSize(11).fillColor('#000');
  doc.text(`Total Questions: ${result.totalQuestions}`);
  doc.text(`Correct Answers: ${result.correctCount}`);
  doc.text(`Incorrect Answers: ${result.incorrectCount}`);
  doc.text(`Timeouts: ${result.timeoutCount}`);
  doc.text(`Overall Accuracy: ${Math.round(result.overallAccuracy * 100)}%`);
  doc.moveDown(1);

  doc.fontSize(13).fillColor('#1e3a5f').text('Round-wise Performance');
  doc.fontSize(11).fillColor('#000');
  result.roundStats.forEach((r) => {
    doc.text(`Round ${r.round}: ${r.correct}/${r.total} correct (${Math.round(r.accuracy * 100)}%)`);
  });
  doc.moveDown(1);

  doc.fontSize(13).fillColor('#1e3a5f').text('Preliminary Screening Result');
  doc.fontSize(11).fillColor('#000');
  const statusLabel =
    result.screeningStatus === 'normal'
      ? 'Normal-range screening result'
      : result.screeningStatus === 'borderline'
      ? 'Borderline screening result'
      : 'Possible color vision deficiency detected';
  doc.text(`Status: ${statusLabel}`);
  if (result.probableCategory) {
    doc.text(`Probable Category: ${result.probableCategory}`);
  }
  doc.moveDown(0.5);
  doc.text(result.explanation, { width: 480 });
  doc.moveDown(1.5);

  doc.fontSize(9).fillColor('#888');
  doc.text('Medical Disclaimer', { underline: true });
  doc.text(result.disclaimer, { width: 480 });
  doc.moveDown(0.5);
  doc.text(
    'This document is a preliminary self-screening summary and is not an official medical certificate or clinical diagnostic report.',
    { width: 480 }
  );

  doc.end();
  return doc;
}

module.exports = { generateReportPdf };
