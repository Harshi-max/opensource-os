# OpenSource OS – AI-Powered Real-Time Collaboration Platform

A production-ready MERN app for open-source communities: real-time chat, live polling, AI recommendations, GitHub-linked rooms, meetings, and more.

---

## Features

### Core
- **Auth** – JWT signup/login, optional GitHub OAuth (link account for rooms/chat/AI).
- **Rooms** – Create rooms from GitHub repos; join/leave; members list.
- **Real-time chat** – Socket.IO chat with typing indicators.
- **Messages** – Send/edit/delete; **@mentions** – only mentioned users and sender see the message; **notifications** in header for when you’re tagged.
- **Polls** – Create polls, vote in real time, see results.
- **AI** – AI recommendations after poll close; **Ask AI** page (onboarding, PRs, poll analysis); **@bot** in room for quick answers; repo-scoped (no suggesting issues/PRs).
- **Voice** – Optional voice messages; TTS for AI answers (browser + server-generated audio).
- **Reputation** – Points for messages, polls, helpfulness.
- **Meetings** – Start/join/end room meetings (Jitsi links); meeting history and AI summaries.
- **Analytics** – Room analytics, contributors, confusing topics, GitHub stats, PR analytics.
- **Doubt polling** – Detect questions, create doubt polls, mentor-style AI analysis.
- **GitHub** – OAuth, webhooks for PR events, conflict/merge notifications, encrypted token storage.
- **Security** – bcrypt, JWT, CORS, Helmet, rate limiting, validation.

### Tech stack
- **Frontend:** React 18, Vite, TailwindCSS, Socket.IO client, Axios, React Router.
- **Backend:** Node, Express, MongoDB (Mongoose), Socket.IO, JWT.
- **External:** OpenAI and/or Groq, GitHub API, GitHub OAuth.

---

## Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- (Optional) OpenAI and/or Groq API key, GitHub OAuth app for full features

### 1. Clone and install

```bash
git clone <repository-url>
cd opensource-os
npm install
npm run install:all
```

### 2. Environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for JWT (e.g. 32+ random chars) |
| `OPENAI_API_KEY` | No | For AI/TTS (or use Groq) |
| `GROQ_API_KEY` | No | Alternative AI provider |
| `GITHUB_TOKEN` | No | GitHub API (repo metadata) |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth app client secret |
| `NODE_ENV` | No | `development` or `production` |
| `PORT` | No | Server port (default 5000) |
| `CLIENT_URL` | No | Frontend URL (e.g. http://localhost:5173) |
| `SERVER_URL` | No | Public server URL (OAuth/webhooks) |

### 3. Run

**Development (frontend + backend):**

```bash
npm run dev
```

- Frontend: http://localhost:5173  
- Backend: http://localhost:5000  

**With Docker (MongoDB):**

```bash
docker-compose up -d
npm run install:all
npm run dev
```

**Production build:**

```bash
npm run build
npm start
```

Serves API and frontend from the same server (e.g. http://localhost:5000).

---

## Project structure

```
opensource-os/
├── server/           # Express API + Socket.IO
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   ├── socket/
│   └── index.js
├── client/           # React (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   └── services/
│   └── vite.config.js
├── package.json
├── docker-compose.yml
└── README.md
```

---

## API overview

- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/profile`, GitHub OAuth URLs and callback.
- **Rooms:** `POST/GET /api/rooms`, `GET/POST /api/rooms/:roomId/join|leave`, `GET /api/rooms/:roomId/messages|polls|meetings|members`, etc.
- **Messages:** `POST /api/messages`, `PUT/DELETE /api/messages/:id` (GitHub required for write).
- **Polls:** Create, vote, close via `/api/polls` and room routes.
- **Meetings:** `GET/POST /api/rooms/:roomId/meetings`, `GET .../active-meeting`, `POST /api/meetings/:id/end`, `PATCH /api/meetings/:id`.
- **Notifications:** `GET /api/notifications` (mentions).
- **Analytics:** Room analytics, contributors, confusing topics, GitHub stats under `/api/rooms/:roomId/...`.

---

## Deployment (e.g. Render)

1. Connect the repo to Render (or similar).
2. Set env vars (at least `MONGO_URI`, `JWT_SECRET`; add `OPENAI_API_KEY`/`GROQ_API_KEY`, GitHub OAuth, `SERVER_URL`/`CLIENT_URL` as needed).
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Use a single web service; optional MongoDB via Atlas.

---

## Troubleshooting

- **403 on login/register** – Rate limit (auth). Wait or set `AUTH_RATE_LIMIT_MAX` in `.env`.
- **403 on messages/rooms** – “Connect GitHub” in header; link GitHub for chat/rooms/AI.
- **Meetings 403** – Resolved: list and active-meeting are now available to any logged-in user; create/end still require GitHub when enforced by product rules.
- **MongoDB connection** – Check `MONGO_URI`, ensure MongoDB is running or Atlas allows your IP.
- **Port in use** – Set `PORT` in `.env` or stop the process using the port.

---

## License

MIT. See LICENSE file.

---

**Built for open-source communities.**
