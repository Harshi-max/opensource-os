import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * MentorResponseCard Component
 * Displays AI mentor's analysis considering community votes
 */
export default function MentorResponseCard({ poll, isLoading = false }) {
  const [expanded, setExpanded] = useState(true)

  if (!poll?.aiAnalysis && !isLoading) return null

  const analysis = poll.aiAnalysis || {}
  const winningOption = poll.options?.reduce((max, o) => (o.voteCount > max.voteCount) ? o : max)

  return (
    <div className="card bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-l-4 border-purple-500 mb-4">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-4 hover:opacity-80 transition"
      >
        <div className="flex items-start gap-3 flex-1">
          {/* AI Avatar */}
          <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
            🤖
          </div>

          <div className="text-left flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-dark-100 font-bold">AI Mentor Analysis</h3>
              {isLoading && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/30 text-purple-300 text-xs rounded animate-pulse">
                  Analyzing...
                </span>
              )}
              {!isLoading && poll.status === 'closed' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/30 text-green-300 text-xs rounded">
                  ✓ Complete
                </span>
              )}
            </div>
            <p className="text-xs text-dark-400">
              Based on {poll.totalVotes} community votes
            </p>
          </div>
        </div>

        {/* Expand Arrow */}
        <ChevronDown
          className={`w-5 h-5 text-dark-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-dark-700 pt-4">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-2">
              <div className="h-3 bg-dark-700/50 rounded w-3/4 animate-pulse"></div>
              <div className="h-3 bg-dark-700/50 rounded w-full animate-pulse"></div>
              <div className="h-3 bg-dark-700/50 rounded w-5/6 animate-pulse"></div>
            </div>
          ) : (
            <>
              {/* Reasoning */}
              {analysis.reasoning && (
                <div className="bg-dark-700/50 border border-dark-600 rounded p-3">
                  <p className="text-xs font-semibold text-dark-300 uppercase mb-1">Reasoning</p>
                  <p className="text-dark-200 text-sm leading-relaxed">
                    {analysis.reasoning}
                  </p>
                </div>
              )}

              {/* Recommendation (Main takeaway) */}
              {analysis.recommendation && (
                <div className="bg-green-900/30 border border-green-700/50 rounded p-3">
                  <p className="text-xs font-semibold text-green-300 uppercase mb-1">💡 Recommendation</p>
                  <p className="text-dark-100 text-sm font-semibold leading-relaxed">
                    {analysis.recommendation}
                  </p>
                  {analysis.confidenceScore !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-green-400">Confidence</span>
                      <div className="flex-1 bg-green-900/50 rounded h-2 overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${(analysis.confidenceScore || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-green-400 w-10 text-right">
                        {((analysis.confidenceScore || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Winning Option Info */}
              {winningOption && (
                <div className="bg-blue-900/30 border border-blue-700/50 rounded p-3">
                  <p className="text-xs font-semibold text-blue-300 uppercase mb-1">🏆 Community Consensus</p>
                  <p className="text-dark-100 text-sm font-medium">
                    "{winningOption.text}"
                  </p>
                  <p className="text-blue-400 text-xs mt-1">
                    {winningOption.voteCount} votes ({((winningOption.voteCount / poll.totalVotes) * 100).toFixed(0)}%)
                  </p>
                </div>
              )}

              {/* Considerations from Votes */}
              {analysis.considerationsFromVotes && analysis.considerationsFromVotes.length > 0 && (
                <div className="bg-dark-700/30 border border-dark-600 rounded p-3">
                  <p className="text-xs font-semibold text-dark-300 uppercase mb-2">Key Points</p>
                  <ul className="space-y-1">
                    {analysis.considerationsFromVotes.map((consideration, idx) => (
                      <li key={idx} className="text-dark-200 text-sm flex gap-2">
                        <span className="text-dark-400">•</span>
                        <span>{consideration}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-dark-500 border-t border-dark-600 pt-2">
                <span>
                  {analysis.model ? `Model: ${analysis.model}` : 'AI Analysis'}
                </span>
                {analysis.generatedAt && (
                  <span>
                    {new Date(analysis.generatedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-3 p-2 bg-dark-700/50 border border-dark-600 rounded text-xs text-dark-400">
        🧠 This recommendation combines community input with AI reasoning!
      </div>
    </div>
  )
}
