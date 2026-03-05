/**
 * Lightweight intent classifier for Open Source Companion.
 * Does NOT call any external AI provider – purely rule-based.
 */
export const classifyIntent = (text) => {
  if (!text || !text.trim()) return 'off_topic';
  const q = text.toLowerCase();

  // Explicit workflow action requests
  if (
    /should i (open|create|raise)\s+(an?\s+)?(issue|pr|pull request)/.test(q) ||
    /(tell|ask)\s+me\s+to\s+(open|create|raise)\s+(an?\s+)?(issue|pr|pull request)/.test(q) ||
    /do you think i should (open|create|raise)\s+(an?\s+)?(issue|pr|pull request)/.test(q)
  ) {
    return 'workflow_action_request';
  }

  // Onboarding / setup / contribution
  if (
    /onboard|onboarding|getting started|how do i start|how to start|first contribution|setup|set up|how can i contribute|how to contribute|contribute to (this )?repo|contribution guide|what is (a )?pr\b|what is (a )?pull request|what('s| is) (an? )?issue|explain (pr|pull request|issue)/.test(
      q
    )
  ) {
    return 'onboarding';
  }

  // Issue help
  if (
    /issue\b|bug\b|error\b|stack trace|exception|failing test|failure|crash/.test(q) &&
    !/pull request|pr\b/.test(q)
  ) {
    return 'issue_help';
  }

  // PR review
  if (/pull request|pr\b|merge conflict|conflicts? in pr|review my pr/.test(q)) {
    return 'pr_review';
  }

  // Poll analysis
  if (/poll\b|vote\b|voting|consensus|disagreement|majority/.test(q)) {
    return 'poll_analysis';
  }

  // Analytics / metrics
  if (/analytics|stats|statistics|metrics|dashboard|resolution time|conflict rate/.test(q)) {
    return 'analytics';
  }

  // Repo-scoped generic: if it clearly references repos, rooms, PRs, issues, GitHub, etc.
  if (
    /github|repository|repo\b|pull request|pr\b|issue\b|room\b|channel\b|merge conflict|open source/.test(
      q
    )
  ) {
    return 'onboarding';
  }

  // Heuristics for off-topic (very rough, but catches obvious cases)
  if (
    /weather|food|movie|music|song|restaurant|dating|life advice|philosophy|motivation/.test(q) &&
    !/github|repo|pull request|issue|open source/.test(q)
  ) {
    return 'off_topic';
  }

  // Default to repository-scoped onboarding/help
  return 'onboarding';
};

/**
 * Post-process model output. Reserved for future use.
 * No replacement of AI answers - let the model respond freely.
 */
export const enforceCollaborationGuardrails = (rawText) => {
  return rawText ? String(rawText) : rawText;
};

