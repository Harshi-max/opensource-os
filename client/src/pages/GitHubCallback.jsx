import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GitHubCallback() {
  const navigate = useNavigate();
  const { reloadUser } = useAuth();
  const [status, setStatus] = useState('Connecting your GitHub account...');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const mode = params.get('mode') || 'login';

    if (!token) {
      setError('Missing authentication token from GitHub OAuth callback.');
      setStatus('');
      return;
    }

    const finalize = async () => {
      try {
        // Persist JWT and refresh current user
        localStorage.setItem('token', token);
        await reloadUser();
        setStatus(
          mode === 'link'
            ? 'GitHub account linked successfully. Redirecting...'
            : 'Signed in with GitHub. Redirecting...'
        );
        setTimeout(() => navigate('/rooms'), 800);
      } catch (e) {
        console.error('GitHub callback error:', e);
        setError('Failed to finalize GitHub authentication. Please try again.');
        setStatus('');
      }
    };

    finalize();
  }, [navigate, reloadUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
      <div className="w-full max-w-md card text-center">
        <h1 className="text-2xl font-bold text-dark-100 mb-4">GitHub Authentication</h1>
        {status && <p className="text-dark-300 mb-2">{status}</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}

