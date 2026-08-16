import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Download } from 'lucide-react';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { getHistory, downloadReport } from '../services/resultService';

const STATUS_LABEL = {
  normal: 'Normal-Range',
  borderline: 'Borderline',
  possible_deficiency: 'Possible CVD',
};

export default function HistoryPage() {
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    getHistory()
      .then(setResults)
      .catch(() => setError('Could not load test history.'));
  }, []);

  async function handleDownload(id) {
    setDownloadingId(id);
    try {
      await downloadReport(id);
    } catch (err) {
      setError('Could not download that report. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-slate-800">Test History</h1>
      <p className="mb-6 text-sm text-slate-500">All your previous screening sessions, newest first.</p>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {results && results.length === 0 && (
        <Card className="text-center text-slate-500">
          No tests taken yet.{' '}
          <Link to="/instructions" className="text-brand-600 hover:underline">
            Start your first test
          </Link>
          .
        </Card>
      )}

      {results && results.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Accuracy</th>
                <th className="px-4 py-3">Screening Result</th>
                <th className="px-4 py-3">Probable Category</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r._id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{new Date(r.completedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{r.correctCount}/{r.totalQuestions}</td>
                  <td className="px-4 py-3">{Math.round(r.overallAccuracy * 100)}%</td>
                  <td className="px-4 py-3">{STATUS_LABEL[r.screeningStatus]}</td>
                  <td className="px-4 py-3">{r.probableCategory ? r.probableCategory.replace('_', '-') : '—'}</td>
                  <td className="flex gap-2 px-4 py-3">
                    <Link to={`/result/${r._id}`}>
                      <Button variant="outline" className="!px-2 !py-1">
                        <Eye size={14} />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="!px-2 !py-1"
                      onClick={() => handleDownload(r._id)}
                      disabled={downloadingId === r._id}
                    >
                      <Download size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}