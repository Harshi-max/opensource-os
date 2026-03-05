import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Room, User, PullRequest } from '../models/index.js';
import { addReputationPoints } from '../services/reputationService.js';

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

const signaturesEqual = (a, b) => {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const verifySignature = (signatureHeader, payload) => {
  if (!WEBHOOK_SECRET) {
    console.error('GitHub webhook secret not configured');
    return false;
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const expected =
    'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');

  return signaturesEqual(signatureHeader, expected);
};

const handlePullRequestEvent = async (req, payload) => {
  const { action, pull_request: pr, repository } = payload;
  if (!pr || !repository) return;

  const owner = repository.owner?.login || repository.owner?.name;
  const name = repository.name;

  if (!owner || !name) return;

  const room = await Room.findOne({ repoOwner: owner, repoName: name });

  const githubId = pr.id;
  const hasConflicts =
    pr.mergeable === false ||
    pr.mergeable_state === 'dirty' ||
    pr.mergeable_state === 'blocked' ||
    false;

  let status = 'open';
  if (pr.merged) {
    status = 'merged';
  } else if (action === 'closed') {
    status = 'closed';
  } else {
    status = 'open';
  }

  const update = {
    roomId: room?._id || null,
    repoOwner: owner,
    repoName: name,
    githubId,
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    authorUsername: pr.user?.login,
    status,
    hasConflicts,
    openedAt: pr.created_at ? new Date(pr.created_at) : new Date(),
    lastEventAt: new Date(),
  };

  if (status === 'closed' || status === 'merged') {
    update.closedAt = pr.closed_at ? new Date(pr.closed_at) : new Date();
  }
  if (status === 'merged') {
    update.mergedAt = pr.merged_at ? new Date(pr.merged_at) : new Date();
  }

  await PullRequest.findOneAndUpdate(
    { githubId },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const authorUsername = pr.user?.login;
  if (!authorUsername) return;

  const user = await User.findOne({ githubUsername: authorUsername });
  if (!user) return;

  // Track PR count and reputation only when PR is opened
  if (action === 'opened') {
    user.prCount = (user.prCount || 0) + 1;
    await user.save();
    await addReputationPoints(user._id.toString(), 'pr_created');
  }

  // Mark helpful contributions when PR is merged
  if (status === 'merged') {
    user.helpfulCount = (user.helpfulCount || 0) + 1;
    await user.save();
  }

  if (!room) return;

  // Notify about merge conflicts
  if (hasConflicts) {
    req.io?.to(`room-${room._id.toString()}`).emit('bot-answer', {
      type: 'info',
      question: '',
      answer: `@${authorUsername} Your PR #${pr.number} has merge conflicts. Please resolve them.`,
      askedBy: 'GitHub Webhook',
      timestamp: new Date(),
    });
  }

  // Notify when PR is closed without merge
  if (status === 'closed' && !pr.merged) {
    req.io?.to(`room-${room._id.toString()}`).emit('bot-answer', {
      type: 'info',
      question: '',
      answer: `PR #${pr.number} by @${authorUsername} was closed without merge in ${owner}/${name}.`,
      askedBy: 'GitHub Webhook',
      timestamp: new Date(),
    });
  }

  // Celebration message when PR gets merged
  if (status === 'merged') {
    req.io?.to(`room-${room._id.toString()}`).emit('bot-answer', {
      type: 'info',
      question: '',
      answer: `🎉 @${authorUsername} had PR #${pr.number} merged into ${owner}/${name}. Great work!`,
      askedBy: 'GitHub Webhook',
      timestamp: new Date(),
    });
  }
};

/**
 * GitHub Webhook handler
 * POST /api/webhooks/github
 *
 * Validates X-Hub-Signature-256 and processes:
 * - pull_request
 * - push
 * - issues
 */
export const handleGitHubWebhook = asyncHandler(async (req, res) => {
  const signature = req.get('x-hub-signature-256') || '';
  const event = req.get('x-github-event') || '';
  const deliveryId = req.get('x-github-delivery');

  if (!verifySignature(signature, req.body)) {
    console.warn('Rejected GitHub webhook: invalid signature', { deliveryId, event });
    return res.status(401).send('Invalid signature');
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch (e) {
    console.error('Failed to parse GitHub webhook payload', e);
    return res.status(400).send('Invalid payload');
  }

  switch (event) {
    case 'pull_request':
      await handlePullRequestEvent(req, payload);
      break;
    case 'push':
    case 'issues':
      // Hooks reserved for future analytics; nothing to do yet
      break;
    default:
      // Ignore other events
      break;
  }

  res.status(200).send('OK');
});

export default { handleGitHubWebhook };

