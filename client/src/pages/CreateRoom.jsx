import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roomAPI } from '../services/api';
import { AlertCircle, Loader, ArrowLeft } from 'lucide-react';

export default function CreateRoom() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [repoUrl, setRepoUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!repoUrl.trim()) {
      setError('Repository URL is required');
      return;
    }

    setLoading(true);

    try {
      const response = await roomAPI.createRoom({ repoUrl: repoUrl.trim() });
      navigate(`/room/${response.data._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && !isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate('/rooms')}
          className="flex items-center space-x-2 text-primary hover:text-primary/80 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Rooms</span>
        </button>

        {/* Form Card */}
        <div className="card">
          <h1 className="text-3xl font-bold text-dark-100 mb-2">
            Create a Room
          </h1>
          <p className="text-dark-400 mb-8">
            Enter a GitHub repository URL to create a live collaboration room
          </p>

          {error && (
            <div className="flex items-start space-x-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-3">
                GitHub Repository URL
              </label>
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                required
              />
              <p className="text-xs text-dark-400 mt-2">
                Example: https://github.com/facebook/react
              </p>
            </div>

            <div className="bg-dark-700/50 border border-dark-600 rounded-lg p-4">
              <h3 className="font-medium text-dark-100 mb-3">What happens next?</h3>
              <ul className="space-y-2 text-sm text-dark-300">
                <li className="flex items-start space-x-3">
                  <span className="text-primary flex-shrink-0">✓</span>
                  <span>We'll fetch repository metadata from GitHub</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-primary flex-shrink-0">✓</span>
                  <span>Create a live chat room for discussion</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-primary flex-shrink-0">✓</span>
                  <span>Enable real-time polling and voting</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-primary flex-shrink-0">✓</span>
                  <span>AI recommendations on poll completion</span>
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Creating room...</span>
                </>
              ) : (
                <span>Create Room</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
