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
  console.log(`🔧 IntentClassifier config: useGroq=${USE_GROQ} (explicitGroq=${explicitGroq}), model=${MODEL}`);
  if (!API_KEY) {
    const provider = USE_GROQ ? 'GROQ' : 'OpenAI';
    console.warn(`⚠️ ${provider} API key not configured.`);
  }
  return { API_URL, API_KEY, MODEL };
};

/**
 * Classify user intent using OpenAI
 * @param {string} message - User message
 * @returns {Promise<string>} - Intent classification (onboarding, issue_help, pr_review, general_chat)
 */
export const classifyIntent = async (message) => {
  const { API_URL, API_KEY, MODEL } = getApiConfig();
  if (!API_KEY) {
    throw new Error('OpenAI/Groq API key not configured');
  }

  try {
    const prompt = `Classify the following developer message into one of these categories:
- onboarding (user is asking how to start contributing, where to begin, how to contribute)
- issue_help (user is asking for help with a specific issue)
- pr_review (user is asking about pull request process)
- general_chat (general conversation)

Return ONLY the label. Do not include any explanation.

Message: "${message}"`;

    const response = await axios.post(
      `${API_URL}/chat/completions`,
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an intent classifier. Classify messages into categories. Return only the category label.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 20,
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const intent = response.data.choices[0].message.content.trim().toLowerCase();
    
    // Validate the response
    const validIntents = ['onboarding', 'issue_help', 'pr_review', 'general_chat'];
    if (validIntents.includes(intent)) {
      return intent;
    }

    return 'general_chat';
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.error('Intent classification error: unauthorized - invalid API key');
      // Treat as general chat if classification fails due to auth
      return 'general_chat';
    }
    console.error('Intent classification error:', error.message);
    return 'general_chat';
  }
};

export default { classifyIntent };
