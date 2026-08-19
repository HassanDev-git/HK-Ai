# HK-Ai

HK-Ai is a React + Vite + Express + Socket.IO AI workspace with Firebase Authentication and an optional `whatsapp-web.js` bridge. The application uses a **login-first** flow: users authenticate with the configured Firebase project, add their own AI provider APIs, and then use chat, models, Web Search, and WhatsApp features.

Each authenticated user receives a personal **AI APIs** panel. The panel supports OpenRouter, OpenAI, Groq, Together AI, Mistral, DeepSeek, Anthropic Claude, Google Gemini, Tavily Web Search, and custom OpenAI-compatible APIs. Provider keys are stored encrypted on the server and are never committed to this repository or returned in full to the browser.

> **Important:** This project requires the Express/Socket.IO server. It is not a static-only website, so GitHub Pages alone cannot run the complete application.

## 1. Download the project

### Using Git

Install [Git](https://git-scm.com/downloads), then run:

```bash
git clone https://github.com/HassanDev-git/HK-Ai.git
cd HK-Ai
```

### Downloading a ZIP

Open the [HK-Ai GitHub repository](https://github.com/HassanDev-git/HK-Ai), select **Code → Download ZIP**, extract the archive, and open a terminal inside the extracted `HK-Ai` folder.

## 2. Requirements

Install **Node.js 20 or newer** from [nodejs.org](https://nodejs.org/). The WhatsApp bridge also requires a Chromium-compatible browser; Puppeteer normally downloads a compatible browser during dependency installation. A Firebase web application is required for login.

## 3. Install dependencies

Run this from the project folder:

```bash
npm install
```

On Windows, use PowerShell or Command Prompt. If `npm` is not recognized, reinstall Node.js and make sure its installation directory is in `PATH`.

## 4. Configure environment variables

Create a local environment file from the safe template:

### macOS/Linux/Git Bash

```bash
cp .env.example .env
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

Open `.env` and set a long, random, stable value for `PROVIDER_CONFIG_ENCRYPTION_KEY`. Do not share this value or commit `.env` to GitHub.

| Variable | Required | Purpose |
|---|---:|---|
| `PROVIDER_CONFIG_ENCRYPTION_KEY` | Yes | Encrypts user-saved provider API configurations. Keep it stable across restarts. |
| `PROVIDER_CONFIG_DIR` | Recommended | Private durable directory for encrypted provider files. |
| `FIREBASE_WEB_API_KEY` | Optional | Overrides the Firebase web API key read from `firebase-applet-config.json`. |

The application does **not** require an owner OpenRouter key for normal user chat. Users add their own provider keys after login. Do not put OpenRouter, OpenAI, Claude, Gemini, Groq, or Tavily keys in the source code.

## 5. Firebase login configuration

The repository contains `firebase-applet-config.json`, which connects the frontend to the configured Firebase web project. Firebase web configuration is client-side configuration; it is not a replacement for AI provider secrets.

In Firebase Console, enable the sign-in methods you want to offer, such as **Email/Password** and **Google**. Add your local and production domains under Firebase Authentication **Authorized domains**. If you are using a different Firebase project, replace `firebase-applet-config.json` with that project's web-app configuration.

## 6. Run the development server

Start HK-Ai with:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The server health endpoint is [http://localhost:3000/health](http://localhost:3000/health).

When the site opens, complete this sequence:

1. Select **Login / Create account**.
2. Sign in through the configured Firebase project.
3. Open **Settings → AI APIs**.
4. Add at least one AI provider API key and save it.
5. Refresh or reopen the model selector. The provider's available model catalog will load automatically.
6. Select a model and start chatting.

## 7. Add AI provider APIs

The personal **AI APIs** panel supports the following providers:

| Provider | Use |
|---|---|
| OpenRouter | Access OpenRouter's model catalog and free/paid models. |
| OpenAI | Use OpenAI models through the OpenAI API. |
| Groq | Use Groq-hosted models through its OpenAI-compatible API. |
| Together AI | Use Together-hosted open models. |
| Mistral | Use Mistral models through its API. |
| DeepSeek | Use DeepSeek models through its API. |
| Anthropic Claude | Use Claude's Models and Messages APIs. |
| Google Gemini | Use Gemini's Generative Language API. |
| Tavily Web Search | Enable Web Research mode. |
| Custom OpenAI-compatible | Add an HTTPS provider base URL exposing `/models` and `/chat/completions`. |

After a provider is saved, the server loads its complete model catalog where the provider exposes pagination or continuation tokens. The main chat selector and WhatsApp model picker use provider-qualified model IDs so models with the same name do not collide.

## 8. Web Search

Web Research requires the user to save a personal **Tavily Web Search** API key under **Settings → AI APIs**. If no Tavily key is configured, the Web Research button opens the API settings panel and displays a setup message. Search results are passed to the selected AI model for synthesis.

## 9. WhatsApp Web bridge

The WhatsApp integration uses `whatsapp-web.js`; the official WhatsApp Business Cloud API is not required by this repository. After connecting WhatsApp through the Bridge page, users can select from the models available through their saved provider APIs.

The bridge stores local WhatsApp authentication data outside the project directory when configured by the local runtime. Do not commit WhatsApp session directories, QR data, or browser caches. If you need to reconnect, use the bridge's disconnect/reset controls rather than deleting random project files while the server is running.

WhatsApp auto-replies use the selected user's provider key. Human handoff detection, conversation memory, reactions, quoted replies, reply queues, and scheduled messages remain available.

## 10. Build and typecheck

Run the production frontend build:

```bash
npm run build
```

Run TypeScript validation:

```bash
npm exec -- tsc --noEmit
```

Existing Vite warnings about Firebase dynamic imports and bundle size do not prevent a successful build.

## 11. Production deployment notes

Deploy the Node/Express server on a host that supports long-running processes, WebSockets, filesystem access for encrypted provider configuration, and Puppeteer if WhatsApp is required. Configure a persistent private directory through `PROVIDER_CONFIG_DIR`; do not use ephemeral storage for user provider settings.

Set the same `PROVIDER_CONFIG_ENCRYPTION_KEY` after every deployment. Rotating it without a migration makes previously saved provider settings unreadable. Use HTTPS in production and restrict access to the provider configuration directory.

For a multi-instance deployment, use shared durable storage or replace the local encrypted-file store with a database-backed secret store before scaling horizontally. Every instance must also share the same encryption key.

## 12. Security checklist

Never commit `.env`, `.env.local`, API keys, service-account JSON files, encrypted provider directories, WhatsApp authentication directories, or browser caches. The repository's `.gitignore` excludes local environment files, build output, dependencies, and WhatsApp session folders.

If an API key is ever pasted into a public issue, commit, screenshot, or chat, revoke or rotate it immediately. The application can only protect keys after they are entered into the authenticated server-side API settings flow.

## License and support

This repository contains the HK-Ai application source. Review each provider's terms, pricing, rate limits, and acceptable-use policies before enabling it. Provider usage and billing are controlled by the account associated with the API key.
