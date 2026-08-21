# HK-Ai

HK-Ai is a React + Vite + Express + Socket.IO AI workspace with Firebase Authentication and an optional `whatsapp-web.js` bridge. The published application is **login-first**: visitors must authenticate through the project owner's Firebase Authentication project before they can access chat, model discovery, research, settings, or WhatsApp features.

After signing in, each user has a personal **AI APIs** panel. Users can connect OpenRouter, OpenAI, Groq, Together AI, Mistral, DeepSeek, Anthropic Claude, Google Gemini, or another OpenAI-compatible provider. The server retrieves that user's provider models and uses the selected user's key for chat and WhatsApp replies. Owner-side AI keys are not returned to the browser and are no longer used as a public fallback.

## Local development

Prerequisites are Node.js 20 or newer and a configured Firebase web application. Install and run the project as follows:

```bash
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell, copy `.env.example` to `.env` manually if `cp` is unavailable. The development server runs at `http://localhost:3000`.

The repository already contains `firebase-applet-config.json`, which binds the frontend to the owner's Firebase project. Its web configuration is not an AI provider secret. If the repository is being transferred to a different owner, replace that file with the new Firebase web-app configuration and enable the required sign-in methods in Firebase Console.

## Required production configuration

Set a stable `PROVIDER_CONFIG_ENCRYPTION_KEY` in the deployment environment. This key encrypts the API keys users save through the AI APIs panel. Do not rotate it casually: changing it makes previously stored provider configurations unreadable unless they are migrated. Set `PROVIDER_CONFIG_DIR` to a private, durable directory or persistent volume in production.

`FIREBASE_WEB_API_KEY` is optional when the server can read the API key from `firebase-applet-config.json`; setting it explicitly is recommended for deployments that do not package that file. `TAVILY_API_KEY` is optional and is only required for shared Deep Research mode. Users still provide their own AI-provider keys from the authenticated panel.

| Variable | Required | Purpose |
|---|---:|---|
| `PROVIDER_CONFIG_ENCRYPTION_KEY` | Yes | Encrypts saved user provider configurations. |
| `PROVIDER_CONFIG_DIR` | Recommended | Durable private storage for encrypted user configuration files. |
| `FIREBASE_WEB_API_KEY` | Recommended | Server-side validation of Firebase ID tokens. |
| `TAVILY_API_KEY` | Optional | Shared real-time research/search capability. |

Never commit `.env`, provider configuration files, service-account JSON files, or user API keys. The repository includes `.env.example` only.

## How users operate the app

A new visitor sees a login gate and must select **Login / Create account**. After Firebase authentication, the user opens **Settings → AI APIs**, selects a provider, enters their own key, and saves it. The server stores only encrypted provider configuration and returns masked key information. The app then refreshes the provider model catalog automatically. Models are shown with provider-qualified identifiers so identical model names from different providers do not collide.

The same provider-qualified model list is used by the main chat model selector and the WhatsApp AI Bridge. WhatsApp remains based on `whatsapp-web.js`; the official WhatsApp Business Cloud API has not been migrated.

## Supported provider modes

OpenAI-compatible providers use their `/v1/models` and `/v1/chat/completions` endpoints. Anthropic uses the Claude Models and Messages APIs, while Google Gemini uses its Generative Language Models and `generateContent` endpoints. A custom provider must expose an HTTPS OpenAI-compatible API base URL.

Provider keys are encrypted at rest by this application, but the running server must decrypt them to call the user's selected provider. Deploy the server only on infrastructure you trust, restrict filesystem access to `PROVIDER_CONFIG_DIR`, and use HTTPS in production.

## Verification commands

```bash
npm run build
npm exec -- tsc --noEmit
```

The project may still report the existing Vite dynamic-import and bundle-size warnings; these are warnings rather than build failures.
