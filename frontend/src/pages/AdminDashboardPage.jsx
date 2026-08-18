import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Images, LayoutDashboard } from 'lucide-react';
import { StatCard, Card } from '../components/Card';
import Button from '../components/Button';
import { getDashboardStats } from '../services/adminService';

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#94a3b8'];
const STATUS_LABEL = {
  normal_range: 'Normal',
  borderline: 'Borderline',
  deficient_range: 'Possible CVD',
  insufficient_data: 'Insufficient Data',
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setError('Could not load admin statistics.'));
  }, []);

  if (error) return <div className="mx-auto max-w-md px-4 py-16 text-center text-red-600">{error}</div>;
  if (!stats) return <div className="flex h-[70vh] items-center justify-center text-slate-500">Loading dashboard...</div>;

  const pieData = stats.screeningDistribution.map((d) => ({
    name: STATUS_LABEL[d._id] || d._id,
    value: d.count,
  }));

  const timeSeriesData = stats.testsOverTime.map((d) => ({ date: d._id, count: d.count }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-2xl font-semibold text-slate-800">
          <LayoutDashboard size={24} /> Admin Dashboard
        </div>
        <Link to="/admin/images">
          <Button>
            <Images size={16} /> Manage Ishihara Images
          </Button>
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Total Tests" value={stats.totalTests} />
        <StatCard label="Tests Today" value={stats.testsToday} />
        <StatCard label="Avg. Accuracy" value={`${Math.round((stats.averageAccuracy || 0) * 100)}%`} />
        <StatCard
          label="Possible CVD Results"
          value={stats.screeningDistribution.find((d) => d._id === 'deficient_range')?.count || 0}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-slate-800">Tests Over Time</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2f6fed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-slate-800">Screening Result Distribution</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}