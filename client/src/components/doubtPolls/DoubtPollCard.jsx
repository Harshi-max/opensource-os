import { useState, useEffect } from 'react'
import { CheckCircle, Clock, Zap } from 'lucide-react'

/**
 * DoubtPollCard Component for OpenSource OS
 * Displays a real-time doubt poll with voting
 * Core of the "Killer Feature"
 */
export default function DoubtPollCard({
  poll,
  onVote,
  currentUserId,
  userReputation = 50,
}) {
  const [hasVoted, setHasVoted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check if current user already voted
  useEffect(() => {
    if (poll?.options) {
      const userVoted = poll.options.some(opt =>
        opt.votes?.some(v => v.userId === currentUserId || v.userId?._id === currentUserId)
      )
      setHasVoted(userVoted)
    }
  }, [poll, currentUserId])

  const calculatePercentage = (voteCount) => {
    if (!poll?.totalVotes || poll.totalVotes === 0) return 0
    return ((voteCount / poll.totalVotes) * 100).toFixed(1)
  }

  const handleVote = async (optionIndex) => {
    if (hasVoted || poll?.status === 'closed') return
    if (isLoading) return

    try {
      setIsLoading(true)
      
      // Call the main onVote callback
      if (onVote) {
        await onVote(optionIndex, poll._id)
      }
      
      setHasVoted(true)
    } catch (error) {
      console.error('Vote error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!poll) return null

  const totalVotes = poll.totalVotes || 0
  const consensusPercentage = poll.consensusPercentage || 0
  const isConsensusReached = consensusPercentage > 75
  const isOpen = poll.status !== 'closed'

  return (
    <div className="card mb-4 border-l-4 border-amber-500">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          {/* Question Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded">
              ❓ Question
            </span>
            <span className={`flex items-center text-xs font-medium space-x-1 px-2 py-1 rounded ${
              isOpen
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {isOpen ? (
                <>
                  <Clock className="w-3 h-3" />
                  <span>Open</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3" />
                  <span>Closed</span>
                </>
              )}
            </span>
          </div>

          {/* Question Text */}
          <h3 className="text-lg font-semibold text-dark-100 mb-2">
            {poll.question}
          </h3>

          {/* Code Context (if available) */}
          {poll.context && (
            <div className="bg-dark-700 border border-dark-600 rounded p-2 my-2 text-xs text-dark-300 font-mono overflow-x-auto max-h-20">
              <pre className="overflow-auto">{poll.context}</pre>
            </div>
          )}
        </div>

        {/* Creator */}
        <div className="text-right ml-4 flex-shrink-0">
          <p className="text-xs text-dark-400">{poll.userId?.name || 'Anonymous'}</p>
        </div>
      </div>

      {/* Consensus Status */}
      {isConsensusReached && (
        <div className="mb-3 inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-300 text-xs font-semibold rounded">
          ✓ {consensusPercentage.toFixed(0)}% Consensus
        </div>
      )}

      {/* Vote Options */}
      <div className="space-y-3 mb-4">
        {poll.options?.map((option, index) => {
          const percentage = calculatePercentage(option.voteCount || 0)
          const userVoted = option.votes?.some(v => v.userId === currentUserId || v.userId?._id === currentUserId)

          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm text-dark-100 cursor-pointer flex items-center space-x-2 flex-1">
                  <input
                    type="radio"
                    name={`poll-${poll._id}`}
                    disabled={hasVoted || isLoading || !isOpen}
                    onChange={() => handleVote(index)}
                    checked={userVoted}
                    className="cursor-pointer"
                  />
                  <span className="flex-1">{option.text}</span>
                </label>
                <div className="text-right">
                  <span className="text-xs text-dark-400">
                    {option.voteCount || 0} ({percentage}%)
                  </span>
                  {userVoted && (
                    <p className="text-xs text-green-400 font-medium">✓ Your vote</p>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-dark-700 rounded overflow-hidden h-2">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Weighted Score Info */}
              {option.weightedScore !== undefined && (
                <p className="text-xs text-dark-500">
                  Weighted: {option.weightedScore.toFixed(1)}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Vote Info */}
      <div className="flex items-center justify-between text-xs text-dark-400 border-t border-dark-700 pt-2">
        <div>
          Total Votes: <span className="text-dark-100 font-semibold">{totalVotes}</span>
        </div>
        <div>
          {hasVoted ? (
            <span className="text-green-400">✓ You voted</span>
          ) : !isOpen ? (
            <span className="text-dark-500">Poll closed</span>
          ) : (
            <span className="text-amber-400 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Vote to influence AI
            </span>
          )}
        </div>
      </div>

      {/* Helper Text */}
      {!hasVoted && isOpen && (
        <div className="mt-3 p-2 bg-dark-700/50 border border-dark-600 rounded text-xs text-dark-400">
          💡 Your vote (weight: {userReputation}%) helps the AI mentor find the best solution!
        </div>
      )}
    </div>
  )
}
