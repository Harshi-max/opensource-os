import axios from 'axios';
import { enforceCollaborationGuardrails } from './intentService.js';

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
  console.log(`🔧 AIService config: useGroq=${USE_GROQ} (explicitGroq=${explicitGroq}), model=${MODEL}`);
  if (!API_KEY) {
    const provider = USE_GROQ ? 'GROQ' : 'OpenAI';
    console.warn(`⚠️ ${provider} API key not configured.`);
  }
  return { API_URL, API_KEY, MODEL };
};

/**
 * Generate AI recommendation based on poll results and chat context
 */
export const generateAIRecommendation = async (pollData, chatMessages) => {
  const { API_URL, API_KEY, MODEL } = getApiConfig();
  if (!API_KEY) {
    throw new Error('OpenAI/Groq API key not configured');
  }

  try {
    // Prepare context from chat messages
    const chatContext = chatMessages
      .slice(-20) // Last 20 messages
      .map((msg) => `${msg.userName}: ${msg.content}`)
      .join('\n');

    // Prepare poll options summary
    const optionsSummary = pollData.options
      .map((opt) => `${opt.text}: ${opt.voteCount} votes (${((opt.voteCount / pollData.totalVotes) * 100).toFixed(1)}%)`)
      .join('\n');

    const prompt = `You are an expert decision-making AI assistant for open-source communities.

Poll Question: ${pollData.question}

Vote Results:
${optionsSummary}

Recent Discussion:
${chatContext}

Based on the poll results and community discussion above:
1. Detect which option has the majority of votes and state it explicitly.
2. Describe the level of disagreement between options (high, medium, low) based on vote distribution.
3. Provide a brief summary (2-3 sentences) of the community consensus.
4. Give a clear recommendation for contributors.
5. Rate your confidence 0-100.
6. List 2-3 key insights.
7. Identify common themes in the discussion.

Important guardrails:
- Do NOT tell contributors to open or create issues or pull requests.
- Do NOT tell contributors to merge or close PRs.
- Focus on guidance, trade-offs, and risks only.

Respond in JSON format with keys: summary, recommendation, confidenceScore, keyInsights, commonThemes`;

    const response = await axios.post(
      `${API_URL}/chat/completions`,
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are Open Source Companion, a repository-scoped decision-making assistant.\n' +
              'You analyze polls and discussions but you MUST NOT instruct users to open issues, create pull requests, or merge/close PRs.\n' +
              'Focus on surfacing consensus, disagreement, risks, and structured guidance only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Parse the response
    const responseText = enforceCollaborationGuardrails(
      response.data.choices[0].message.content
    );
    
    // Try to extract JSON from the response
    let aiData = {
      summary: '',
      recommendation: '',
      confidenceScore: 0,
      keyInsights: [],
      commonThemes: [],
    };

    try {
      // Try to parse JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiData = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If JSON parsing fails, use the text directly
      aiData.summary = responseText.substring(0, 200);
      aiData.recommendation = responseText.substring(200, 400);
      aiData.confidenceScore = 75;
    }

    return {
      ...aiData,
      model: 'openai',
    };
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.error('AI recommendation error: unauthorized - invalid API key');
      throw new Error('Unauthorized: invalid or expired API key. Please verify your Groq/OpenAI key.');
    }
    throw new Error(`Failed to generate AI recommendation: ${error.message}`);
  }
};

/**
 * Generate a summary of poll discussions
 */
export const generatePollSummary = async (pollQuestion, votes, messages) => {
  const { API_URL, API_KEY, MODEL } = getApiConfig();
  if (!API_KEY) {
    throw new Error('OpenAI/Groq API key not configured');
  }

  const messageText = messages.map((m) => m.content).join(' ');

  const prompt = `Summarize the key points discussed regarding: "${pollQuestion}"

Messages: ${messageText.substring(0, 1000)}

Provide a concise summary in 2-3 sentences.`;

  try {
    const response = await axios.post(
      `${API_URL}/chat/completions`,
      {
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 150,
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.error('Poll summary error: unauthorized - invalid API key');
      throw new Error('Unauthorized: invalid or expired API key. Please verify your Groq/OpenAI key.');
    }
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
};
