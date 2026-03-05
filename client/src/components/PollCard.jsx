import { CheckCircle, Clock } from 'lucide-react';

export default function PollCard({ poll, onVote, userVoteId }) {
  const calculatePercentage = (voteCount) => {
    if (poll.totalVotes === 0) return 0;
    return ((voteCount / poll.totalVotes) * 100).toFixed(1);
  };

  const isOpen = !poll.isClosed;
  const userHasVoted = poll.votes?.some(
    (v) => v.userId._id === userVoteId || v.userId === userVoteId
  );

  return (
    <div className="card mb-4">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-dark-100 flex-1">
          {poll.question}
        </h3>
        <div
          className={`flex items-center text-xs font-medium space-x-1 px-2 py-1 rounded ${
            isOpen
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {isOpen ? (
            <>
              <Clock className="w-4 h-4" />
              <span>Open</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Closed</span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {poll.options.map((option) => (
          <div key={option._id}>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm text-dark-100 cursor-pointer flex items-center space-x-2">
                <input
                  type="radio"
                  name={`poll-${poll._id}`}
                  value={option._id}
                  disabled={!isOpen}
                  onChange={() => onVote(option._id)}
                  checked={userHasVoted && userVoteId === option._id}
                  className="cursor-pointer"
                />
                <span>{option.text}</span>
              </label>
              <span className="text-xs text-dark-400">
                {option.voteCount} ({calculatePercentage(option.voteCount)}%)
              </span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${calculatePercentage(option.voteCount)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-dark-400 text-right">
        Total votes: {poll.totalVotes}
      </div>
    </div>
  );
}
