import { Zap, TrendingUp } from 'lucide-react';

export default function AIDecisionCard({ aiResponse }) {
  if (!aiResponse) {
    return (
      <div className="card bg-dark-700/50 border-dashed">
        <p className="text-dark-400 text-sm">
          AI response will be generated when poll closes...
        </p>
      </div>
    );
  }

  const getConfidenceColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="card border-primary/50 bg-dark-700/50">
      <div className="flex items-start space-x-3 mb-4">
        <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-dark-100">
            AI Recommendation
          </h3>
          <p className="text-xs text-dark-400">
            Powered by {aiResponse.model === 'openai' ? 'OpenAI' : 'Gemini'}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-dark-100 mb-3">{aiResponse.recommendation}</p>
        <p className="text-sm text-dark-300 mb-4">{aiResponse.summary}</p>
      </div>

      {/* Confidence Meter */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-dark-400">Confidence</span>
          <span className={`font-semibold ${getConfidenceColor(aiResponse.confidenceScore)}`}>
            {aiResponse.confidenceScore}%
          </span>
        </div>
        <div className="w-full bg-dark-600 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-yellow-500 to-green-500 h-2 rounded-full transition-all"
            style={{ width: `${aiResponse.confidenceScore}%` }}
          />
        </div>
      </div>

      {/* Key Insights */}
      {aiResponse.keyInsights?.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-dark-100 mb-2 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Key Insights</span>
          </h4>
          <ul className="space-y-1">
            {aiResponse.keyInsights.map((insight, idx) => (
              <li key={idx} className="text-sm text-dark-300 flex items-start space-x-2">
                <span className="text-primary mt-1">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Common Themes */}
      {aiResponse.commonThemes?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-dark-100 mb-2">
            Common Themes
          </h4>
          <div className="flex flex-wrap gap-2">
            {aiResponse.commonThemes.map((theme, idx) => (
              <span
                key={idx}
                className="text-xs bg-primary/20 text-primary px-2 py-1 rounded"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
