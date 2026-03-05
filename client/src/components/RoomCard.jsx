import { useNavigate } from 'react-router-dom';
import { Star, GitFork, Users } from 'lucide-react';

export default function RoomCard({ room }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/room/${room._id}`)}
      className="card cursor-pointer hover:border-primary transition transform hover:scale-105"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-dark-100 truncate">
            {room.repoName}
          </h3>
          <p className="text-sm text-dark-400">{room.repoOwner}</p>
        </div>
        <div className="flex items-center space-x-1 text-xs text-primary">
          <Star className="w-4 h-4" />
          <span>{room.stars}</span>
        </div>
      </div>

      <p className="text-sm text-dark-300 mb-4 line-clamp-2">
        {room.description || 'No description available'}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {room.metadata?.topics?.slice(0, 3).map((topic) => (
          <span
            key={topic}
            className="text-xs bg-primary/20 text-primary px-2 py-1 rounded"
          >
            {topic}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-dark-700">
        <div className="flex items-center space-x-3 text-xs text-dark-400">
          <div className="flex items-center space-x-1">
            <GitFork className="w-4 h-4" />
            <span>{room.forks}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{room.members?.length || 0}</span>
          </div>
        </div>
        <span className="text-xs text-dark-500">
          {room.language}
        </span>
      </div>
    </div>
  );
}
