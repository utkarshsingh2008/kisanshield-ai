# KisanShield AI

A hyperlocal agricultural weather intelligence and crop-advisory prototype.

## Features
- Live location search through Open-Meteo Geocoding.
- Live current weather and 7-day forecast through Open-Meteo.
- Transparent rule-based weather risk assessment.
- AI-generated crop guidance through OpenRouter.
- English and Hindi advisory output.
- Graceful fallback when the AI key is not configured or the provider is unavailable.

## Requirements
- Node.js 20 or newer
- An OpenRouter API key for AI-generated advice: https://openrouter.ai/keys

## 1. Install
From the project root:

```bash
npm install
npm --prefix server install
npm --prefix client install
```

## 2. Configure environment
Copy `server/.env.example` to `server/.env` and add your OpenRouter key.

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
```

The weather and geocoding APIs are public and do not require a key.

## 3. Run locally
From the root:

```bash
npm run dev
```

Open http://localhost:5173

The frontend proxies `/api` requests to the Express server on port 5000.

## 4. Test the backend
Open http://localhost:5000/api/health

Expected response:

```json
{ "status": "ok", "service": "KisanShield AI API" }
```

## 5. Deploy
### Backend (Render)
- Create a new Web Service from the GitHub repository.
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Add `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `CLIENT_ORIGIN`.
- `CLIENT_ORIGIN` should be your deployed Vercel URL.

### Frontend (Vercel)
- Import the same GitHub repository.
- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Add environment variable `VITE_API_URL` with your Render backend URL, e.g. `https://your-api.onrender.com/api`.

## Important demo notes
- Weather information is retrieved live from Open-Meteo. It is forecast data, not a guarantee of future conditions.
- Risk labels are heuristic indicators based on forecast thresholds, not official agricultural warnings.
- AI advice is generated from the retrieved weather and user-selected crop context. It is not a substitute for a local agricultural expert.
- Never commit `.env` or expose the OpenRouter key in frontend code.
