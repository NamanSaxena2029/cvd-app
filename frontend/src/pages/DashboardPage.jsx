import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { PlayCircle } from 'lucide-react';
import { StatCard, Card } from '../components/Card';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { getHistory } from '../services/resultService';

export default function DashboardPage() {
  const { user } = useAuth();
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getHistory()
      .then(setResults)
      .catch(() => setError('Could not load your data.'));
  }, []);

  const totalTests = results?.length || 0;
  const latest = results?.[0];
  const best = results?.reduce((b, r) => (!b || r.overallAccuracy > b.overallAccuracy ? r : b), null);

  const trendData = results
    ? [...results]
        .slice(0, 10)
        .reverse()
        .map((r, i) => ({ name: `#${i + 1}`, accuracy: Math.round(r.overallAccuracy * 100) }))
    : [];

  let comparison = null;
  if (results && results.length >= 2) {
    const [newest, prev] = results;
    const diff = Math.round((newest.overallAccuracy - prev.overallAccuracy) * 100);
    comparison = { diff, newest, prev };
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-slate-500">Here's a summary of your color vision screening activity.</p>
        </div>
        <Link to="/instructions">
          <Button className="px-6 py-3">
            <PlayCircle size={18} /> Start New Test
          </Button>
        </Link>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Tests Taken" value={totalTests} />
        <StatCard label="Latest Score" value={latest ? `${latest.correctCount}/${latest.totalQuestions}` : '—'} />
        <StatCard label="Latest Accuracy" value={latest ? `${Math.round(latest.overallAccuracy * 100)}%` : '—'} />
        <StatCard label="Best Score" value={best ? `${Math.round(best.overallAccuracy * 100)}%` : '—'} />
      </div>

      {comparison && (
        <Card className="mb-6">
          <h2 className="mb-2 font-semibold text-slate-800">Compared to Previous Test</h2>
          <p className="text-sm text-slate-600">
            Previous: {Math.round(comparison.prev.overallAccuracy * 100)}% → Latest:{' '}
            {Math.round(comparison.newest.overallAccuracy * 100)}%{' '}
            <span className={comparison.diff >= 0 ? 'text-green-600' : 'text-red-600'}>
              ({comparison.diff >= 0 ? '+' : ''}
              {comparison.diff} percentage points)
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Note: this reflects screening test performance only, not a medical improvement/worsening judgment.
          </p>
        </Card>
      )}

      {trendData.length > 1 && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold text-slate-800">Accuracy Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="accuracy" stroke="#2f6fed" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {results && results.length === 0 && (
        <Card className="text-center text-slate-500">
          You haven't taken a test yet.{' '}
          <Link to="/instructions" className="text-brand-600 hover:underline">
            Start now
          </Link>
          .
        </Card>
      )}

      {results && results.length > 0 && (
        <div className="text-right">
          <Link to="/history" className="text-sm text-brand-600 hover:underline">
            View full history →
          </Link>
        </div>
      )}
    </div>
  );
}
