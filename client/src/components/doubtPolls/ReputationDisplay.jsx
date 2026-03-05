import React from 'react'
import { TrendingUp, Award, Zap } from 'lucide-react'

/**
 * ReputationDisplay Component
 * Shows user reputation score, tier, badges, and other stats
 */
export default function ReputationDisplay({
  reputation = {},
  isCompact = false,
}) {
  if (!reputation || !reputation.totalScore) {
    return null
  }

  // Determine user tier
  const getTierInfo = (tier) => {
    const tiers = {
      Newcomer: { color: 'text-gray-400', icon: '🌱', bg: 'bg-gray-900/30' },
      Contributor: { color: 'text-blue-400', icon: '⭐', bg: 'bg-blue-900/30' },
      Expert: { color: 'text-purple-400', icon: '✨', bg: 'bg-purple-900/30' },
      Master: { color: 'text-yellow-400', icon: '👑', bg: 'bg-yellow-900/30' },
    }
    return tiers[tier] || tiers.Newcomer
  }

  const tierInfo = getTierInfo(reputation.tier || 'Newcomer')
  const badges = reputation.badges || []
  const badgeEmojis = {
    'First Poll': '🎉',
    'Poll Master': '🏆',
    'Helpful Guide': '💡',
    'Code Reviewer': '👀',
    'Community Champion': '🌟',
    'Trustworthy Mentor': '🎖️',
  }

  if (isCompact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg">{tierInfo.icon}</span>
        <div>
          <p className="text-dark-100 font-semibold text-sm">{reputation.totalScore}</p>
          <p className="text-dark-400 text-xs">{reputation.tier || 'Newcomer'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 bg-dark-700/50 rounded-lg border border-dark-600 p-4">
      {/* Tier Card */}
      <div className={`${tierInfo.bg} rounded p-3 border border-dark-600`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-dark-400 uppercase mb-1">Tier</p>
            <p className="text-dark-100 font-bold text-lg flex items-center gap-2">
              {tierInfo.icon} {reputation.tier || 'Newcomer'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-400 flex items-center gap-1">
              <TrendingUp className="w-5 h-5" />
              {reputation.totalScore}
            </p>
            <p className="text-xs text-dark-400">Points</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-dark-600/50 rounded p-2 text-center border border-dark-600">
          <p className="text-sm font-bold text-blue-400">{reputation.votesGiven || 0}</p>
          <p className="text-xs text-dark-400">Votes</p>
        </div>
        <div className="bg-dark-600/50 rounded p-2 text-center border border-dark-600">
          <p className="text-sm font-bold text-purple-400">{reputation.pollsCreated || 0}</p>
          <p className="text-xs text-dark-400">Polls</p>
        </div>
        <div className="bg-dark-600/50 rounded p-2 text-center border border-dark-600">
          <p className="text-sm font-bold text-green-400">{(reputation.pollAccuracyScore || 0).toFixed(0)}%</p>
          <p className="text-xs text-dark-400">Accuracy</p>
        </div>
        <div className="bg-dark-600/50 rounded p-2 text-center border border-dark-600">
          <p className="text-sm font-bold text-amber-400">{(reputation.trustScore || 0).toFixed(0)}/100</p>
          <p className="text-xs text-dark-400">Trust</p>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="border-t border-dark-600 pt-2">
          <p className="text-xs font-semibold text-dark-400 uppercase mb-2 flex items-center gap-1">
            <Award className="w-3 h-3" /> Achievements
          </p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge, idx) => (
              <div
                key={idx}
                title={badge.name}
                className="w-8 h-8 rounded bg-yellow-900/30 flex items-center justify-center text-base border border-yellow-700/50 cursor-help"
              >
                {badgeEmojis[badge.name] || '🏅'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
