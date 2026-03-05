import { useState } from 'react';
import { Zap, ExternalLink, Sparkles, Trophy, AlertCircle } from 'lucide-react';

export default function ContributionGuideCard({ response }) {
  const [expanded, setExpanded] = useState(true);

  if (!response) return null;

  const {
    content,
    repoName,
    suggestedIssue,
    difficulty,
    triggeredBy,
    createdAt,
  } = response;

  const getDifficultyColor = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'hard':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/40 rounded-lg overflow-hidden shadow-xl hover:shadow-primary/20 transition-shadow mb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/30 to-primary/10 px-6 py-4 border-b border-primary/20 flex items-center justify-between cursor-pointer hover:from-primary/40 transition" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center space-x-3">
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          <div>
            <h3 className="text-lg font-bold text-dark-100">🚀 Contribution Guide</h3>
            <p className="text-xs text-dark-400">AI-Generated Onboarding from {triggeredBy}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(difficulty)}`}>
            {difficulty?.charAt(0).toUpperCase() + difficulty?.slice(1)} Issue
          </span>
          <button
            className="p-2 hover:bg-primary/20 rounded transition"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <svg
              className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="px-6 py-4 space-y-4 bg-dark-900/50">
          {/* Repository Info */}
          <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-dark-400">Repository</p>
                <p className="text-lg font-semibold text-dark-100">{repoName}</p>
              </div>
              {suggestedIssue && (
                <a
                  href={`https://github.com/search?q=is:issue+repo:*&p=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-3 py-2 bg-primary/20 hover:bg-primary/30 rounded transition border border-primary/30"
                >
                  <span className="text-sm font-medium">Issue #{suggestedIssue}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Main Roadmap Content */}
          <div className="bg-dark-800/30 rounded-lg p-4 border border-dark-700/30 text-dark-100 space-y-3 text-sm leading-relaxed max-h-96 overflow-y-auto prose prose-invert">
            {/* Parse and render markdown-like content */}
            {content.split('\n').map((line, idx) => {
              if (!line.trim()) return null;

              // Headers (lines with emojis and dots or numbers)
              if (line.match(/^[\d#️⃣🎯📖🔧⚠️⏱️]+\.|^#+\s|^[\uD83D\uDE80-\uDF00]+/)) {
                return (
                  <div key={idx} className="font-semibold text-dark-50 mt-3 mb-2 text-base">
                    {line}
                  </div>
                );
              }

              // Indented content or bullet points
              if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                return (
                  <div key={idx} className="ml-4 text-dark-300 flex-1">
                    {line}
                  </div>
                );
              }

              // Regular paragraphs
              if (line.trim()) {
                return (
                  <div key={idx} className="text-dark-200">
                    {line}
                  </div>
                );
              }

              return null;
            })}
          </div>

          {/* Tips Box */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-300">Pro Tip</p>
              <p className="text-xs text-yellow-200/80">
                Start by reading the repository README and contributing guidelines. Don't hesitate to ask questions in PRs!
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-dark-700/30">
            <p className="text-xs text-dark-500">
              Generated on {new Date(createdAt).toLocaleString()}
            </p>
            <span className="text-xs bg-primary/20 px-2 py-1 rounded text-primary font-medium">
              AI Generated
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
