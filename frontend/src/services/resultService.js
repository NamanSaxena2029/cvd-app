import api from './api';

export async function getResult(id) {
  const { data } = await api.get(`/results/${id}`);
  return data.result;
}

export async function getHistory() {
  const { data } = await api.get('/results/history');
  return data.results;
}

// Kept for reference / non-authenticated contexts, but plain <a href> to this
// URL will 403 because the browser navigation carries no Authorization or
// x-guest-token header. Use downloadReport() below instead.
export function getReportDownloadUrl(id) {
  return `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/results/${id}/report`;
}

// Fetches the PDF through axios (so auth/guest headers are attached),
// then triggers a client-side file download via a blob URL.
export async function downloadReport(id) {
  const response = await api.get(`/results/${id}/report`, {
    responseType: 'blob',
  });

  const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `cvd-screening-report-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function getSharedResult(shareToken) {
  const { data } = await api.get(`/results/shared/${shareToken}`);
  return data.result;
}