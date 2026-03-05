import { asyncHandler } from '../middleware/errorHandler.js';
import { getApiConfig } from '../services/aiMentorService.js';
import { Message } from '../models/index.js';
import { generateSpeech } from '../services/ttsService.js';
import { classifyIntent, enforceCollaborationGuardrails } from '../services/intentService.js';

// simple endpoint to ask a question about a room/repository
export const askQuestion = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { question } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const intent = classifyIntent(question);

  // Off-topic: do not call external AI at all
  if (intent === 'off_topic') {
    return res.json({
      answer:
        'I am your Open Source Companion for this repository.\n' +
        'I can only assist with discussions, issues, pull requests, onboarding, and repository collaboration topics.',
      audioUrl: null,
    });
  }

  // Workflow action requests: respond with guardrail text and skip AI call
  if (intent === 'workflow_action_request') {
    return res.json({
      answer:
        'As your Open Source Companion, I do not initiate repository actions.\n' +
        'I can help analyze discussions and provide guidance based on context,\n' +
        'but maintainers and contributors decide workflow actions.',
      audioUrl: null,
    });
  }

  const { API_URL, API_KEY, MODEL, USE_GROQ } = getApiConfig();
  if (!API_KEY) {
    return res.status(500).json({ error: 'AI provider not configured' });
  }

  // optionally include last few messages from the room as context
  let contextText = '';
  if (roomId) {
    try {
      const recent = await Message.find({ roomId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      if (recent.length) {
        contextText = recent
          .map((m) => `${m.userId?.name || 'Someone'}: ${m.content}`)
          .reverse()
          .join('\n');
      }
    } catch (e) {
      // ignore, we don't want to fail just for context
    }
  }

  const prompt =
    `You are Open Source Companion, operating strictly within the active GitHub repository.\n` +
    `User intent: ${intent}.\n` +
    (contextText ? `Context from recent chat:\n${contextText}\n\n` : '') +
    `Question: ${question}`;

  const resp = await fetch(`${API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are Open Source Companion, a repository-scoped collaboration assistant for this GitHub repository.\n\n' +
            'You MUST answer helpfully when users ask about:\n' +
            '- What a PR (pull request) is, what an issue is, how they work in open source\n' +
            '- How to contribute to the repo, onboarding steps, first-time contributor guidance\n' +
            '- Repository guidelines, code review, merge conflicts, and collaboration workflow\n' +
            '- Polls, discussions, and consensus in the repo context\n' +
            '- Explaining repo-related concepts (e.g. "what is a PR?", "how can I contribute?")\n\n' +
            'You are NOT allowed to:\n' +
            '- Suggest or instruct the user to open/create an issue or PR, or to merge/close PRs\n' +
            '- Answer topics unrelated to the repo (e.g. weather, food, general life advice)\n\n' +
            'You are allowed to:\n' +
            '- Explain what PRs and issues are and how contribution works\n' +
            '- Give onboarding roadmaps and contribution steps\n' +
            '- Explain PR conflicts, guidelines, and risks\n' +
            '- Summarize discussions and analyze polls\n' +
            '- Detect consensus or disagreement\n\n' +
            'If the user asks whether they should open an issue or PR, say you do not initiate actions and that maintainers/contributors decide. Otherwise answer their question clearly and helpfully.\n',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  const data = await resp.json();
  const rawAnswer = data.choices?.[0]?.message?.content || '';
  const answer = enforceCollaborationGuardrails(rawAnswer);

  // Try to generate TTS audio for natural voice response
  let audioUrl = null;
  try {
    // Only attempt TTS if using OpenAI (not Groq)
    if (!USE_GROQ) {
      audioUrl = await generateSpeech(answer);
    }
  } catch (ttsErr) {
    console.warn('TTS generation failed:', ttsErr.message);
    // Continue without audio, client will use browser speech synthesis as fallback
  }

  res.json({ answer, audioUrl });
});

export default { askQuestion };