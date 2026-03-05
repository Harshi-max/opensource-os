import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roomAPI, analyticsAPI } from '../services/api';
import { BarChart3, Users, TrendingUp, AlertTriangle, Loader, ArrowLeft } from 'lucide-react';

export default function Analytics() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [topContributors, setTopContributors] = useState([]);
  const [confusingTopics, setConfusingTopics] = useState([]);
  const [githubStats, setGithubStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // don't force login; analytics page is viewable by guests too
  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadAnalytics(selectedRoom._id);
    }
  }, [selectedRoom]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const response = await roomAPI.getAllRooms('');
      setRooms(response.data);
      if (response.data.length > 0) {
        setSelectedRoom(response.data[0]);
      }
    } catch (err) {
      setError('Failed to load rooms');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async (roomId) => {
    try {
      const [analyticsRes, contributorsRes, topicsRes, githubRes] = await Promise.all([
        analyticsAPI.getRoomAnalytics(roomId),
        analyticsAPI.getTopContributors(roomId),
        analyticsAPI.getMostConfusingTopics(roomId),
        analyticsAPI.getGitHubStats(roomId).catch(() => null), // GitHub stats optional
      ]);

      setAnalytics(analyticsRes.data);
      setTopContributors(contributorsRes.data);
      setConfusingTopics(topicsRes.data);
      setGithubStats(githubRes?.data || null);
    } catch (err) {
      setError('Failed to load analytics');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex justify-center items-center">
        <Loader className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate('/rooms')}
            className="p-2 hover:bg-dark-700 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-4xl font-bold text-dark-100">Analytics</h1>
        </div>

        {error && (
          <div className="card bg-red-500/10 border-red-500/30 text-red-400 mb-8">
            {error}
          </div>
        )}

        {/* Room Selector */}
        {rooms.length > 0 && (
          <div className="mb-8">
            <label className="block text-sm font-medium text-dark-200 mb-3">
              Select Repository
            </label>
            <select
              value={selectedRoom?._id || ''}
              onChange={(e) => {
                const room = rooms.find((r) => r._id === e.target.value);
                setSelectedRoom(room);
              }}
              className="w-full max-w-md"
            >
              <option value="">Choose a repository...</option>
              {rooms.map((room) => (
                <option key={room._id} value={room._id}>
                  {room.repoName} ({room.repoOwner})
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedRoom && analytics && (
          <>
            {/* Overview Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Polls"
                value={analytics.totalPolls}
                icon={<BarChart3 className="w-6 h-6" />}
              />
              <StatCard
                title="Total Messages"
                value={analytics.totalMessages}
                icon={<TrendingUp className="w-6 h-6" />}
              />
              <StatCard
                title="Active Contributors"
                value={analytics.activeContributorsCount}
                icon={<Users className="w-6 h-6" />}
              />
              <StatCard
                title="Avg Agreement Rate"
                value={`${analytics.averageAgreementRate}%`}
                icon={<TrendingUp className="w-6 h-6" />}
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Top Contributors */}
              <div className="card">
                <h2 className="text-xl font-bold text-dark-100 mb-4 flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Top Contributors</span>
                </h2>

                {topContributors.length > 0 ? (
                  <div className="space-y-3">
                    {topContributors.map((contributor, idx) => (
                      <div
                        key={contributor._id}
                        className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-sm font-semibold text-primary">
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-medium text-dark-100">
                              {contributor.user.name}
                            </p>
                            <p className="text-xs text-dark-400">
                              Reputation: {contributor.user.reputation}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">
                            {contributor.messageCount}
                          </p>
                          <p className="text-xs text-dark-400">messages</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark-400">No contributors yet</p>
                )}
              </div>

              {/* Most Confusing Topics */}
              <div className="card">
                <h2 className="text-xl font-bold text-dark-100 mb-4 flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Most Disputed Topics</span>
                </h2>

                {confusingTopics.length > 0 ? (
                  <div className="space-y-4">
                    {confusingTopics.map((topic, idx) => (
                      <div key={idx} className="border-b border-dark-700 pb-4 last:border-0">
                        <p className="font-medium text-dark-100 mb-2 line-clamp-2">
                          {topic.question}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-dark-400">
                            Disagreement: {topic.disagreementRate.toFixed(1)}%
                          </span>
                          <span className="text-dark-500">
                            {topic.totalVotes} votes
                          </span>
                        </div>
                        <div className="w-full bg-dark-700 rounded-full h-2 mt-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${topic.disagreementRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark-400">No polls yet</p>
                )}
              </div>

              {/* Most Discussed Topics */}
              {analytics.mostDiscussedTopics?.length > 0 && (
                <div className="card">
                  <h2 className="text-xl font-bold text-dark-100 mb-4">
                    Most Discussed Topics
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {analytics.mostDiscussedTopics.map((topic) => (
                      <span
                        key={topic}
                        className="text-sm bg-primary/20 text-primary px-3 py-1 rounded-full"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* GitHub Stats */}
              {githubStats && (
                <div className="lg:col-span-2 card">
                  <h2 className="text-xl font-bold text-dark-100 mb-4">GitHub Repository Stats</h2>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-dark-700/50 p-4 rounded-lg">
                      <p className="text-dark-400 text-sm mb-1">Total PRs</p>
                      <p className="text-2xl font-bold text-primary">{githubStats.totalPRs || 0}</p>
                    </div>
                    <div className="bg-dark-700/50 p-4 rounded-lg">
                      <p className="text-dark-400 text-sm mb-1">Merged PRs</p>
                      <p className="text-2xl font-bold text-green-400">{githubStats.mergedPRs || 0}</p>
                    </div>
                    <div className="bg-dark-700/50 p-4 rounded-lg">
                      <p className="text-dark-400 text-sm mb-1">Open PRs</p>
                      <p className="text-2xl font-bold text-blue-400">{githubStats.openPRs || 0}</p>
                    </div>
                    <div className="bg-dark-700/50 p-4 rounded-lg">
                      <p className="text-dark-400 text-sm mb-1">Closed PRs</p>
                      <p className="text-2xl font-bold text-red-400">{githubStats.closedPRs || 0}</p>
                    </div>
                    <div className="bg-dark-700/50 p-4 rounded-lg">
                      <p className="text-dark-400 text-sm mb-1">Total Issues</p>
                      <p className="text-2xl font-bold text-orange-400">{githubStats.totalIssues || 0}</p>
                    </div>
                    <div className="bg-dark-700/50 p-4 rounded-lg">
                      <p className="text-dark-400 text-sm mb-1">Contributors</p>
                      <p className="text-2xl font-bold text-purple-400">{githubStats.contributors?.length || 0}</p>
                    </div>
                  </div>

                  {githubStats.contributors && githubStats.contributors.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-dark-100 mb-3">Top Contributors</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {githubStats.contributors.slice(0, 10).map((contributor, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-dark-700/30 rounded"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-primary">#{idx + 1}</span>
                              <img
                                src={contributor.avatar}
                                alt={contributor.login}
                                className="w-6 h-6 rounded-full"
                              />
                              <a
                                href={contributor.profileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-blue-400 hover:underline"
                              >
                                {contributor.login}
                              </a>
                            </div>
                            <span className="text-sm text-dark-400">{contributor.contributions} commits</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {githubStats.recentPRs && githubStats.recentPRs.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-dark-700">
                      <h3 className="font-semibold text-dark-100 mb-3">Recent Pull Requests</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {githubStats.recentPRs.slice(0, 5).map((pr) => (
                          <a
                            key={pr.prNumber}
                            href={pr.prUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block p-2 bg-dark-700/30 rounded hover:bg-dark-700/50 transition"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-dark-100 truncate">#{pr.prNumber}: {pr.title}</p>
                                <p className="text-xs text-dark-400">by {pr.author}</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ml-2 ${
                                pr.status === 'merged' ? 'bg-purple-500/20 text-purple-400' :
                                pr.status === 'open' ? 'bg-green-500/20 text-green-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {pr.status}
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Disagreement Rate */}
              <div className="card">
                <h2 className="text-xl font-bold text-dark-100 mb-4">
                  Poll Disagreement Rate
                </h2>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {analytics.pollDisagreementRate}%
                  </div>
                  <p className="text-dark-400">
                    Percentage of polls with low consensus
                  </p>
                  <div className="mt-4 w-24 h-24 rounded-full border-4 border-dark-700 flex items-center justify-center mx-auto"
                    style={{
                      background: `conic-gradient(rgb(99, 102, 241) 0% ${analytics.pollDisagreementRate}%, rgb(39, 39, 42) ${analytics.pollDisagreementRate}% 100%)`
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {rooms.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-dark-400 mb-4">No rooms available</p>
            <button
              onClick={() => navigate('/rooms')}
              className="btn-primary"
            >
              Go to Rooms
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-dark-400 text-sm mb-2">{title}</p>
          <p className="text-3xl font-bold text-dark-100">{value}</p>
        </div>
        <div className="text-primary">{icon}</div>
      </div>
    </div>
  );
}
