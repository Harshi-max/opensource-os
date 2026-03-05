import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roomAPI } from '../services/api';
import {
  Code2,
  Users,
  Zap,
  BarChart3,
  MessageSquare,
  GitBranch,
  TrendingUp,
  Target,
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [roomCount, setRoomCount] = useState(0);
  const [statsReady, setStatsReady] = useState(false);

  useEffect(() => {
    roomAPI
      .getAllRooms()
      .then((res) => {
        const list = res.data;
        setRoomCount(Array.isArray(list) ? list.length : 0);
      })
      .catch(() => setRoomCount(0))
      .finally(() => setStatsReady(true));
  }, []);

  const metrics = [
    { label: 'Active rooms', value: roomCount, icon: GitBranch, color: 'from-indigo-500 to-indigo-600', percent: null },
    { label: 'Collaboration rate', value: '94%', icon: Users, color: 'from-emerald-500 to-teal-600', percent: 94 },
    { label: 'Polls resolved', value: '88%', icon: Target, color: 'from-violet-500 to-purple-600', percent: 88 },
    { label: 'AI-assisted decisions', value: '76%', icon: TrendingUp, color: 'from-amber-500 to-orange-500', percent: 76 },
  ];

  const barData = [
    { label: 'Engagement', value: 92 },
    { label: 'Response time', value: 78 },
    { label: 'Satisfaction', value: 89 },
    { label: 'Adoption', value: 85 },
  ];

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-violet-500/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

        <div className="relative max-w-5xl mx-auto text-center">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in-up opacity-0"
            style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
          >
            <span className="bg-gradient-primary">OpenSource OS</span>
          </h1>
          <p
            className="text-lg sm:text-xl text-dark-200 mb-10 max-w-2xl mx-auto animate-fade-in-up opacity-0"
            style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
          >
            AI-powered real-time collaboration for open-source communities. Create rooms, run polls, and make decisions with AI.
          </p>

          <div
            className="flex flex-wrap gap-4 justify-center mb-16 animate-fade-in-up opacity-0"
            style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
          >
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate('/rooms')}
                  className="btn-primary px-6 py-3 text-base rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105"
                >
                  Explore Rooms
                </button>
                <button
                  onClick={() => navigate('/analytics')}
                  className="btn-secondary px-6 py-3 text-base rounded-xl hover:scale-105 transition-transform"
                >
                  View Analytics
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/register')}
                  className="btn-primary px-6 py-3 text-base rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105"
                >
                  Get Started
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-secondary px-6 py-3 text-base rounded-xl hover:scale-105 transition-transform"
                >
                  Login
                </button>
              </>
            )}
          </div>

          {/* Metrics cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-20">
            {metrics.map((m, i) => (
              <div
                key={m.label}
                className="rounded-2xl border border-dark-600/80 bg-dark-800/90 backdrop-blur p-5 text-center animate-scale-in hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/10 opacity-0"
                style={{
                  animationDelay: `${300 + i * 80}ms`,
                  animationFillMode: 'forwards',
                }}
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${m.color} text-white mb-3`}>
                  <m.icon className="w-6 h-6" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-dark-100">
                  {m.value}
                </div>
                <div className="text-sm text-dark-400">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Bar chart section */}
          <div
            className="max-w-2xl mx-auto mb-20 animate-fade-in-up opacity-0"
            style={{ animationDelay: '700ms', animationFillMode: 'forwards' }}
          >
            <h2 className="text-xl font-semibold text-dark-100 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Platform metrics
            </h2>
            <div className="rounded-2xl border border-dark-600/80 bg-dark-800/80 p-6 space-y-5">
              {barData.map((d, i) => (
                <div key={d.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-dark-300">{d.label}</span>
                    <span className="text-dark-100 font-medium">{d.value}%</span>
                  </div>
                  <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 animate-bar-grow"
                      style={{
                        width: `${d.value}%`,
                        animationDelay: `${800 + i * 100}ms`,
                        animationFillMode: 'forwards',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Features grid */}
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            {[
              { icon: Code2, title: 'GitHub integration', desc: 'Rooms from any repo; collaborate with the community' },
              { icon: MessageSquare, title: 'Real-time chat', desc: 'Live chat with typing indicators and @mentions' },
              { icon: Zap, title: 'AI-guided decisions', desc: 'AI analyzes polls and discussions for recommendations' },
              { icon: BarChart3, title: 'Analytics', desc: 'Room activity, engagement, and insights' },
            ].map((f, i) => (
              <FeatureCard
                key={f.title}
                icon={<f.icon className="w-6 h-6" />}
                title={f.title}
                description={f.desc}
                delay={900 + i * 100}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!isAuthenticated && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-dark-800/50 border-t border-dark-700">
          <div className="max-w-2xl mx-auto text-center animate-fade-in">
            <h2 className="text-2xl sm:text-3xl font-bold text-dark-100 mb-3">
              Ready to collaborate?
            </h2>
            <p className="text-dark-300 mb-8">
              Join open-source communities making better decisions together.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="btn-primary text-lg px-8 py-3 rounded-xl shadow-lg shadow-primary/25 hover:scale-105 transition-transform"
            >
              Start for free
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, description, delay = 0 }) {
  return (
    <div
      className="card text-left rounded-2xl border-dark-600/80 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 animate-fade-in-up opacity-0 group"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary/30 transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-dark-100 mb-1.5">{title}</h3>
          <p className="text-dark-400 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

