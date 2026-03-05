import axios from 'axios';
import { DoubtPoll } from '../models/index.js';

// Compute API config lazily to avoid import-time env read issues
export const getApiConfig = () => {
  // if a Groq key exists, always use Groq regardless of flag
  const explicitGroq = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== '';
  const USE_GROQ = explicitGroq || process.env.GROQ_ENABLED === 'true';
  const GROQ_API_URL = 'https://api.groq.com/openai/v1';
  const OPENAI_API_URL = 'https://api.openai.com/v1';
  const API_URL = USE_GROQ ? GROQ_API_URL : OPENAI_API_URL;
  const API_KEY = USE_GROQ ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY;
  // allow environment override so we can adapt to deprecations
  // choose a model that your Groq key can access; the provider now recommends
  // openai/gpt-oss-120b after many older Llama models were retired
  const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
  const MODEL = USE_GROQ
    ? process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL
    : 'gpt-3.5-turbo';

  // logging for clarity
  console.log(`🔧 AI config: useGroq=${USE_GROQ} (explicitGroq=${explicitGroq}), model=${MODEL}`);
  if (!API_KEY) {
    const provider = USE_GROQ ? 'GROQ' : 'OpenAI';
    console.warn(`⚠️ ${provider} API key not configured. Requests will fail.`);
  }

  return { USE_GROQ, API_URL, API_KEY, MODEL };
};

/**
 * AI Mentor Service - Provides hybrid AI + crowd answers
 * Analyzes doubt polls and combines community feedback with AI reasoning
 */

/**
 * Analyze doubt poll and generate AI mentor response
 * @param {Object} doubtPoll - The doubt poll from database
 * @param {Object} user - User who asked the doubt
 * @returns {Promise<Object>} - AI analysis with reasoning and recommendation
 */
export const analyzeDoubtAndGenerateMentorResponse = async (doubtPoll, user) => {
  const { API_URL, API_KEY, MODEL } = getApiConfig();
  if (!API_KEY) {
    throw new Error('OpenAI/Groq API key not configured');
  }

  // retry logic in case we hit rate limits (429)
  const maxRetries = 3;
  let attempt = 0;

  while (true) {
    try {
      // Get poll statistics
      const totalVotes = doubtPoll.totalVotes;
      const optionsText = doubtPoll.options
        .map((opt) => {
          const percentage = totalVotes > 0 ? ((opt.voteCount / totalVotes) * 100).toFixed(1) : 0;
          return `${opt.text}: ${opt.voteCount} votes (${percentage}%)`;
        })
        .join('\n');

      // Extract community considerations
      const considerations = doubtPoll.options
        .sort((a, b) => b.weightedScore - a.weightedScore)
        .slice(0, 3)
        .map((arr) => `${opt.text} (${opt.weightedScore} weighted votes)`);

      const prompt = `You are an expert mentor helping developers make good decisions in open-source projects.

A developer asked: "${doubtPoll.question}"

${doubtPoll.context ? `Context/Code:\n${doubtPoll.context}\n\n` : ''}

Community voted on these options:
${optionsText}

The developer has ${user.reputation} reputation points on this platform.

Based on:
1. The community's democratic vote
2. The weighted opinions of experienced contributors
3. Best practices in open-source development

Provide:
1. A brief explanation of why the community voted this way
2. What factors they likely considered
3. Your expert recommendation (may align or differ from consensus)
4. Key considerations they should keep in mind
5. Confidence score (0-100) in this recommendation

Format your response as JSON with keys: reason, recommendation, confidence, considerations.`;

      const response = await axios.post(
        `${API_URL}/chat/completions`,
        {
          model: MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are an experienced open-source mentor. Provide balanced, practical advice that respects community input while adding your expertise.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 800,
        },
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const responseText = response.data.choices[0].message.content;

      // Parse JSON response
      let mentorAnalysis = {
        reasoning: 'Community insights analyzed',
        recommendation: 'See AI analysis',
        confidenceScore: 75,
        considerationsFromVotes: [],
      };

      try {
        const parsed = JSON.parse(responseText);
        mentorAnalysis = {
          reasoning: parsed.reason || mentorAnalysis.reasoning,
          recommendation: parsed.recommendation || mentorAnalysis.recommendation,
          confidenceScore: parsed.confidence || 75,
          considerationsFromVotes: parsed.considerations || [],
        };
      } catch (parseError) {
        // Fallback if JSON parsing fails
        mentorAnalysis.recommendation = responseText;
      }

      return mentorAnalysis;
    } catch (error) {
      // if rate limited, retry with backoff
      if (error.response && error.response.status === 429 && attempt < maxRetries) {
        attempt++;
        const delayMs = attempt * 1000;
        console.warn(`Rate limit hit, retrying in ${delayMs}ms (attempt ${attempt})`);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      // if rate limit persists after retries, throw a specific message
      if (error.response && error.response.status === 429) {
        console.error('Mentor analysis error: rate limit exceeded');
        throw new Error('Rate limit exceeded, please try again later');
      }

      // unauthorized/invalid key
      if (error.response && error.response.status === 401) {
        console.error('Mentor analysis error: unauthorized - invalid API key');
        throw new Error('Unauthorized: invalid or expired API key. Please verify your Groq/OpenAI key.');
      }

      // log detailed response if available (400/bad request, validation errors, etc.)
      if (error.response) {
        console.error('Mentor analysis error response status:', error.response.status);
        console.error('Mentor analysis error response data:', JSON.stringify(error.response.data));
      }
      console.error('Mentor analysis error:', error.message);
      throw new Error(`Failed to generate mentor response: ${error.message}`);
    }
  }
};

/**
 * Calculate weighted vote scores based on user reputation
 * More reputable users' votes count more
 * @param {Object} doubtPoll - The doubt poll
 * @param {Map} userReputation - Map of userId to reputation
 */
export const recalculateWeightedVotes = (doubtPoll, userReputation) => {
  doubtPoll.options.forEach((option) => {
    option.weightedScore = 0;

    option.votes.forEach((vote) => {
      const userRep = userReputation.get(vote.userId.toString()) || 50;
      // Weight votes: higher reputation = more weight
      const weight = (userRep / 100) * 2; // Scale to 0-2x
      option.weightedScore += weight;
    });
  });

  return doubtPoll;
};

/**
 * Generate automated doubt poll from a message
 * Detects question-like messages and creates poll suggestions
 * @param {string} message - User message
 * @returns {Promise<Array>} - Suggested poll options
 */
export const suggestPollOptions = async (message) => {
  const { API_URL: suggestApiUrl, API_KEY: suggestApiKey, MODEL: suggestModel } = getApiConfig();
  if (!suggestApiKey) {
    throw new Error('OpenAI/Groq API key not configured');
  }

  try {
    const prompt = `Analyze this developer question and suggest 3 poll options they could vote on.
The options should help gather community opinion on their doubt.

Question: "${message}"

Respond ONLY with a JSON array with 3 objects: { "text": "option text" }
Example: [{"text": "Option 1"}, {"text": "Option 2"}, {"text": "Option 3"}]`;

    const response = await axios.post(
      `${suggestApiUrl}/chat/completions`,
      {
        model: suggestModel,
        messages: [
          {
            role: 'system',
            content: 'You generate helpful poll options for developer questions. Keep options clear and actionable.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 200,
      },
      {
        headers: {
          'Authorization': `Bearer ${suggestApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const responseText = response.data.choices[0].message.content;
    const options = JSON.parse(responseText);

    return options;
  } catch (error) {
    const isGroqEnabled = process.env.GROQ_ENABLED === 'true';
    const apiUsed = isGroqEnabled ? 'Groq' : 'OpenAI';
    console.error(`❌ Poll suggestion error [${apiUsed}]:`, error.message);
    if (error.response) {
      console.error('  Response status:', error.response.status);
      console.error('  Response data:', JSON.stringify(error.response.data));
    } else if (error.request) {
      console.error('  No response received. Request config:', error.request);
    }
    
    // Return default options if AI fails
    return [
      { text: "Yes, this is a good idea" },
      { text: "No, there's a better approach" },
      { text: "Need more context to decide" },
    ];
  }
};

/**
 * Detect if a message is asking a doubt/question
 * @param {string} message - User message
 * @returns {Promise<boolean>} - True if it's a question
 */
export const isDoubtMessage = async (message) => {
  // Quick heuristics first
  const doubtPatterns = [
    /\?$/,
    /should\s+i\s+/i,
    /how\s+(do|can|should)\s+i\s+/i,
    /what's\s+the\s+best\s+way\s+to\s+/i,
    /is\s+this\s+correct\?/i,
    /any\s+suggestions|thoughts|recommendations/i,
    /stuck\s+on|struggling\s+with/i,
  ];

  const isQuestionLike = doubtPatterns.some((pattern) => pattern.test(message));

  if (!isQuestionLike) {
    return false;
  }

  // If clear doubt pattern, confirm with AI
  const { API_URL: detectApiUrl, API_KEY: detectApiKey, MODEL: detectModel } = getApiConfig();

  if (!detectApiKey) {
    return isQuestionLike;
  }

  try {
    const response = await axios.post(
      `${detectApiUrl}/chat/completions`,
      {
        model: detectModel,
        messages: [
          {
            role: 'system',
            content: 'You classify if a message is a question/doubt that should have a poll. Respond with ONLY "yes" or "no".',
          },
          {
            role: 'user',
            content: `Is this a doubt/question? Message: "${message}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 5,
      },
      {
        headers: {
          'Authorization': `Bearer ${detectApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = response.data.choices[0].message.content.toLowerCase();
    return result.includes('yes');
  } catch (error) {
    console.error('Doubt detection error:', error.message);
    return isQuestionLike;
  }
};


/**
 * Analyze a meeting summary and return a brief analysis with
 * key takeaways, action items, and any suggestions for next steps.
 * @param {string} summary
 * @returns {Promise<string>} analysis text
 */
export const analyzeMeetingSummary = async (summary) => {
  const { API_URL, API_KEY, MODEL } = getApiConfig();
  if (!API_KEY) {
    throw new Error('OpenAI/Groq API key not configured');
  }

  const prompt = `You are a helpful assistant that reads a meeting summary and
extracts the key takeaways, next steps, and any recommendations.

Meeting summary:\n${summary}\n\nProvide your answer as a concise paragraph or bullet points.`;

  const response = await axios.post(
    `${API_URL}/chat/completions`,
    {
      model: MODEL,
      messages: [
        { role: 'system', content: 'You analyze meeting summaries to produce insights.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    },
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.choices[0].message.content;
};

export default {
  analyzeDoubtAndGenerateMentorResponse,
  recalculateWeightedVotes,
  suggestPollOptions,
  isDoubtMessage,
  analyzeMeetingSummary,
};
