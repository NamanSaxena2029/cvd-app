import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Download, History, RotateCcw, LayoutDashboard, Share2 } from 'lucide-react';
import { Card, StatCard } from '../components/Card';
import Button from '../components/Button';
import Disclaimer from '../components/Disclaimer';
import { getResult, downloadReport } from '../services/resultService';
import { useAuth } from '../context/AuthContext';

const OFFICIAL_STATUS_LABEL = {
  normal_range: 'Normal-Range Screening Result',
  borderline: 'Borderline Screening Result',
  deficient_range: 'Pattern Consistent With Possible Colour Vision Deficiency',
  insufficient_data: 'Not Enough Data For an Official-Rule Result',
};

const OFFICIAL_STATUS_COLOR = {
  normal_range: 'bg-green-50 text-green-800 border-green-200',
  borderline: 'bg-amber-50 text-amber-800 border-amber-200',
  deficient_range: 'bg-red-50 text-red-800 border-red-200',
  insufficient_data: 'bg-slate-50 text-slate-700 border-slate-200',
};

export default function ResultPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const [result, setResult] = useState(location.state?.result || null);
  const [loading, setLoading] = useState(!location.state?.result);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    if (result) return;
    setLoading(true);
    getResult(id)
      .then(setResult)
      .catch(() => setError('Could not load this result.'))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex h-[70vh] items-center justify-center text-slate-500">Loading result...</div>;
  if (error || !result) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-red-600">{error || 'Result not found.'}</div>;
  }

  const official = result.officialScreening || {};
  const chartData = (result.roundStats || []).map((r) => ({
    name: `Round ${r.round}`,
    accuracy: Math.round((r.accuracy || 0) * 100),
  }));

  function handleShare() {
    const url = `${window.location.origin}/shared/${result.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownload() {
    setDownloadError('');
    setDownloading(true);
    try {
      await downloadReport(result._id);
    } catch (err) {
      setDownloadError('Could not download the report. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-slate-800">Your Screening Result</h1>
      <p className="mb-6 text-sm text-slate-500">
        Completed on {new Date(result.completedAt).toLocaleString()}
      </p>

      {/* Official Ishihara-rule screening result */}
      <Card className={`mb-6 border ${OFFICIAL_STATUS_COLOR[official.status] || OFFICIAL_STATUS_COLOR.insufficient_data}`}>
        <h2 className="mb-1 text-sm font-medium uppercase tracking-wide opacity-70">
          Preliminary Screening Result (Ishihara Scoring Rule)
        </h2>
        <p className="mb-2 text-xl font-semibold">
          {OFFICIAL_STATUS_LABEL[official.status] || 'Unavailable'}
        </p>
        {official.presentedCount != null && official.fullOfficialSetSize != null && (
          <p className="mb-2 text-sm">
            {official.normalReadCount} of {official.presentedCount} official screening plates read
            normally (out of {official.fullOfficialSetSize} in the full set).
          </p>
        )}
        {official.subtype?.label && (
          <p className="mb-2 text-sm">
            Subtype: <strong>{official.subtype.label}</strong>
            {official.subtype.confidence && ` (${official.subtype.confidence} confidence)`}
          </p>
        )}
        {official.subtype && !official.subtype.label && (
          <p className="mb-2 text-sm italic opacity-80">Subtype could not be reliably estimated.</p>
        )}
        {official.note && <p className="text-sm opacity-90">{official.note}</p>}
      </Card>

      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        This Application's Timed-Response Experiment (not the official Ishihara procedure)
      </p>

      {/* Overall project-level metrics */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Overall Score" value={`${result.correctCount}/${result.totalQuestions}`} />
        <StatCard label="Accuracy" value={`${Math.round((result.overallAccuracy || 0) * 100)}%`} />
        <StatCard label="Incorrect" value={result.incorrectCount} />
        <StatCard label="Timeouts" value={result.timeoutCount} />
      </div>

      {/* Round performance chart */}
      <Card className="mb-6">
        <h2 className="mb-4 font-semibold text-slate-800">Round Performance</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} unit="%" />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar dataKey="accuracy" fill="#2f6fed" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-2 font-semibold text-slate-800">Summary</h2>
        <p className="text-sm text-slate-700">{result.explanation}</p>
      </Card>

      <div className="mb-6">
        <Disclaimer />
      </div>

      {!user && (
        <Card className="mb-6 bg-brand-50 text-center">
          <p className="mb-3 text-sm text-slate-700">Create an account to save your test history.</p>
          <Link to="/register">
            <Button>Create Account</Button>
          </Link>
        </Card>
      )}

      {downloadError && <p className="mb-3 text-sm text-red-600">{downloadError}</p>}

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={handleDownload} disabled={downloading}>
          <Download size={16} /> {downloading ? 'Preparing...' : 'Download Report'}
        </Button>
        <Button variant="outline" onClick={handleShare}>
          <Share2 size={16} /> {copied ? 'Link Copied!' : 'Share Result'}
        </Button>
        {user && (
          <Link to="/history">
            <Button variant="outline">
              <History size={16} /> View History
            </Button>
          </Link>
        )}
        <Link to="/instructions">
          <Button variant="secondary">
            <RotateCcw size={16} /> Retake Test
          </Button>
        </Link>
        {user && (
          <Link to="/dashboard">
            <Button variant="secondary">
              <LayoutDashboard size={16} /> Back to Dashboard
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}