import axios from 'axios';

// Compute API config at call-time
const getApiConfig = () => {
  const explicitGroq = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== '';
  const USE_GROQ = explicitGroq || process.env.GROQ_ENABLED === 'true';
  const GROQ_API_URL = 'https://api.groq.com/openai/v1';
  const OPENAI_API_URL = 'https://api.openai.com/v1';
  const API_URL = USE_GROQ ? GROQ_API_URL : OPENAI_API_URL;
  const API_KEY = USE_GROQ ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY;
  const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
  const MODEL = USE_GROQ
    ? process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL
    : 'gpt-3.5-turbo';
  console.log(`🔧 ContributionEngine config: useGroq=${USE_GROQ} (explicitGroq=${explicitGroq}), model=${MODEL}`);
  if (!API_KEY) {
    const provider = USE_GROQ ? 'GROQ' : 'OpenAI';
    console.warn(`⚠️ ${provider} API key not configured.`);
  }  return { API_URL, API_KEY, MODEL };
};

/**
 * Generate AI-powered contribution roadmap
 * @param {Object} user - User object with reputation
 * @param {Object} repoData - Repository data including name and description
 * @param {Array} issues - Array of beginner-friendly issues
 * @param {string} readme - Repository README content (truncated)
 * @returns {Promise<Object>} - Generated roadmap with content and metadata
 */
export const generateContributionRoadmap = async (user, repoData, issues, readme) => {
  const { API_URL, API_KEY, MODEL } = getApiConfig();
  if (!API_KEY) {
    throw new Error('OpenAI/Groq API key not configured');
  }

  try {
    // Format issues for the prompt
    const issuesText = issues
      .slice(0, 5)
      .map((issue, idx) => {
        return `${idx + 1}. [#${issue.number}] ${issue.title}
   Difficulty: ${issue.difficulty || 'Medium'}
   Comments: ${issue.commentCount || 0}
   Updated: ${issue.updatedAt ? new Date(issue.updatedAt).toLocaleDateString() : 'N/A'}
   URL: ${issue.url}`;
      })
      .join('\n\n');

    // Build personalization hint based on reputation
    let reputationHint = '';
    if (user.reputation < 50) {
      reputationHint = 'This user is a beginner contributor. Focus on very beginner-friendly guidance.';
    } else if (user.reputation < 200) {
      reputationHint = 'This user has some experience. Suggest issues of mixed complexity.';
    } else {
      reputationHint = 'This user is an experienced contributor. Suggest moderately complex issues.';
    }

    const prompt = `You are an expert open-source mentor helping new contributors get started.

${reputationHint}

Repository Information:
Name: ${repoData.repoName}
Description: ${repoData.description || 'N/A'}
URL: ${repoData.repoUrl}
Language: ${repoData.language || 'Unknown'}
Stars: ${repoData.stars || 0}

Recommended beginner-friendly issues:
${issuesText}

Repository README (excerpt):
${readme ? readme.substring(0, 500) : 'N/A'}

Generate a structured step-by-step contribution roadmap that includes:

1. 📖 What to Read First (suggest README sections and documentation)
2. 🎯 Suggested First Issue (recommend one of the issues above with reasoning)
3. 📁 Files to Explore (what key files/folders to look at)
4. 🔧 How to Submit Your First PR (step-by-step)
5. ⚠️ Common Beginner Mistakes to Avoid
6. ⏱️ Estimated Time to Complete

Format the response with:
- Clear emoji headers
- Numbered steps where applicable
- Practical, actionable advice
- Encouraging and supportive tone
- Include links to the suggested issue

Make it beautiful, structured, and beginner-friendly but practical.`;

    const response = await axios.post(
      `${API_URL}/chat/completions`,
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert open-source community mentor. Generate clear, structured, and encouraging contribution roadmaps for new contributors. Use emojis and formatting to make guides engaging.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content;

    return {
      content,
      repoName: repoData.repoName,
      repoUrl: repoData.repoUrl,
      suggestedIssue: issues[0]?.number || null,
      difficulty: issues[0]?.difficulty || 'Medium',
      generatedAt: new Date(),
      model: 'openai',
      confidenceScore: 85,
    };
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.error('Contribution roadmap error: unauthorized - invalid API key');
      throw new Error('Unauthorized: invalid or expired API key. Please verify your Groq/OpenAI key.');
    }
    console.error('Contribution roadmap generation error:', error.message);
    throw new Error(`Failed to generate contribution roadmap: ${error.message}`);
  }
};

/**
 * Filter issues based on user reputation
 * @param {Array} issues - Array of issues
 * @param {number} reputation - User reputation score
 * @returns {Array} - Filtered and ranked issues
 */
export const filterIssuesByReputation = (issues, reputation) => {
  return issues.filter((issue) => {
    const { difficulty } = issue;

    if (reputation < 50) {
      // Only show easy issues for beginners
      return difficulty === 'easy' || difficulty === 'beginner' || !difficulty;
    } else if (reputation < 200) {
      // Show easy and medium issues
      return difficulty !== 'hard' && difficulty !== 'advanced';
    }

    // Show all issues for experienced users
    return true;
  });
};

export default { generateContributionRoadmap, filterIssuesByReputation };
