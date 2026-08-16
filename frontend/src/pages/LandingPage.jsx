import { Link } from 'react-router-dom';
import { Eye, Timer, ListChecks, BarChart3, ShieldCheck, ArrowRight } from 'lucide-react';
import Button from '../components/Button';
import { Card } from '../components/Card';
import Disclaimer from '../components/Disclaimer';

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <Eye size={28} />
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Preliminary Color Vision Screening, Right in Your Browser
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            A fast, Ishihara-pattern based screening tool to help you understand your color
            vision — 3 timed rounds, instant results, downloadable report.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/instructions">
              <Button className="px-6 py-3 text-base">
                Start Test <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="outline" className="px-6 py-3 text-base">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* What is CVD */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <h2 className="mb-2 text-xl font-semibold text-slate-800">What is Color Vision Deficiency?</h2>
            <p className="text-slate-600">
              Color vision deficiency (often called "color blindness") affects how a person
              perceives certain colors, most commonly reds and greens. It can be inherited or
              acquired, and its severity varies widely between individuals.
            </p>
          </Card>
          <Card>
            <h2 className="mb-2 text-xl font-semibold text-slate-800">How the Ishihara Test Works</h2>
            <p className="text-slate-600">
              Ishihara-style plates contain a pattern of colored dots forming a number or shape.
              People with typical color vision see the pattern clearly, while people with certain
              deficiencies may see a different number, or none at all.
            </p>
          </Card>
        </div>
      </section>

      {/* How our screening works - 3 step process */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-2xl font-semibold text-slate-800">
            How Our Screening Works
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: ListChecks, title: '1. Answer 3 Rounds', desc: '10 plates shown per round, 30 questions total, across 3 progressively faster rounds.' },
              { icon: Timer, title: '2. Beat the Clock', desc: 'Each question has a countdown timer that shortens as rounds progress.' },
              { icon: BarChart3, title: '3. Get Your Report', desc: 'See accuracy, round-wise performance, and a preliminary screening result.' },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon size={24} />
                </div>
                <h3 className="mb-1 font-semibold text-slate-800">{title}</h3>
                <p className="text-sm text-slate-500">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-10 text-center text-2xl font-semibold text-slate-800">Features</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            'Randomized Ishihara plates',
            'Timed, 3-round testing',
            'Category-level analysis',
            'Downloadable PDF report',
            'Test history & trends',
            'Guest testing (no login required)',
            'Shareable result link',
            'Admin-managed plate library',
          ].map((f) => (
            <Card key={f} className="flex items-center gap-2 text-sm text-slate-700">
              <ShieldCheck size={16} className="text-brand-600" />
              {f}
            </Card>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mx-auto max-w-4xl px-4 pb-20">
        <Disclaimer />
      </section>
    </div>
  );
}
