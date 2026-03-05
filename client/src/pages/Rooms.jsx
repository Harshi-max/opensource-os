import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roomAPI } from '../services/api';
import RoomCard from '../components/RoomCard';
import { Plus, Search, Loader } from 'lucide-react';

export default function Rooms() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // If auth is complete and user is not authenticated, redirect to login
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    loadRooms();
  }, [authLoading, isAuthenticated, search]); // Include authLoading

  const loadRooms = async () => {
    try {
      setLoading(true);
      const response = await roomAPI.getAllRooms(search);
      setRooms(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load rooms');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-dark-100">Repositories</h1>
          <button
            onClick={() => navigate('/create-room')}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Room</span>
          </button>
        </div>

        {/* Search */}
        <div className="mb-8 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10"
          />
        </div>

        {/* Content */}
        {error && (
          <div className="card bg-red-500/10 border-red-500/30 text-red-400 mb-8">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-dark-400 mb-4">
              {search ? 'No rooms found matching your search' : 'No rooms yet'}
            </p>
            {!search && (
              <button
                onClick={() => navigate('/create-room')}
                className="btn-primary inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create the first room</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <RoomCard key={room._id} room={room} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
