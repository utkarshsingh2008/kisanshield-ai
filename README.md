# 🌾 KisanShield AI

### AI-Powered Weather Intelligence & Smart Farming Advisory Platform

KisanShield AI is an intelligent agricultural support platform designed to help Indian farmers make informed farming decisions using real-time weather information, market prices, AI-powered crop guidance, and image-based crop health screening.

The platform combines weather intelligence, agricultural data APIs, geolocation, and Generative AI to provide accessible, location-aware farming assistance.

---

## 🚀 Live Demo

| Resource | Link |
|---|---|
| 🌐 Live Application | https://kisanshield-ai-frontend.vercel.app/ |
| ⚙️ Backend Health Check | https://kisanshield-ai-sigma.vercel.app/api/health |
| 💻 GitHub Repository | https://github.com/utkarshsingh2008/kisanshield-ai |
| 🎥 Demo Video | https://www.youtube.com/watch?v=IV1q9leI0Dw |

---

## 🎯 Problem Statement

Indian farmers face several challenges when making day-to-day agricultural decisions:

- Unpredictable weather and climate-related risks.
- Limited access to location-specific agricultural information.
- Difficulty identifying crop diseases at an early stage.
- Lack of easily accessible and understandable mandi price information.
- Limited access to personalized agricultural guidance.

KisanShield AI addresses these challenges through a unified, AI-powered digital farming assistant.

## 💡 Key Features

### 1. 🌦️ Weather Intelligence
- Live weather information and 7-day forecasts.
- Location-based weather retrieval.
- Weather risk assessment to highlight potentially harmful conditions.
- Practical weather-aware farming recommendations.

### 2. 🤖 AI-Powered Crop Advisory
- Personalized agricultural recommendations.
- Crop and growth-stage-specific guidance.
- Context-aware responses using available weather and agricultural information.
- English and Hindi language support.

### 3. 🌱 AI Crop Disease Screening
- Upload crop leaf images for visual analysis.
- Gemini-powered image screening.
- Identifies visible symptoms and possible disease categories.
- Provides preliminary prevention and containment suggestions.
- Clearly communicates that AI screening is not a confirmed diagnosis.

### 4. 📍 Smart Location Search
- Search for cities, districts, and farming locations.
- Geocoding-based location identification.
- Supports location-aware weather and agricultural services.

### 5. 📊 Mandi Price Intelligence
- Retrieves agricultural market price records.
- Search by state, district, and commodity.
- Displays available minimum, modal, and maximum prices.
- Helps farmers compare market information before making selling decisions.

### 6. 💬 AI Farming Assistant
- Interactive agricultural question-answering.
- Context-aware responses using crop, location, weather, and available market information.
- Designed to provide concise and practical farming guidance.

### 7. 🌐 Multilingual & Accessible Interface
- English and Hindi support.
- Responsive interface for desktop and mobile devices.
- Simple workflows designed around farmers' needs.

---

## 🏗️ Technical Architecture

### Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, JavaScript, Tailwind CSS, Vite |
| Backend | Node.js, Express.js |
| AI Model | Google Gemini API |
| Weather Data | Weather Forecast API |
| Market Data | Data.gov.in / Agmarknet API |
| Geolocation | Open-Meteo Geocoding API |
| Image Analysis | Gemini Vision |
| Deployment | Vercel |
| Version Control | Git and GitHub |

### System Workflow

```text
       Farmer
          |
          v
   React Web Application
          |
          v
     Express Backend
          |
    +-----+------+----------------+
    |            |                |
    v            v                v
 Weather API  Mandi API     Geocoding API
    |            |                |
    +------------+----------------+
                 |
                 v
          Agricultural Context
                 |
                 v
             Gemini AI
                 |
       +---------+----------+
       |                    |
       v                    v
  Crop Advisory       Image Screening
       |                    |
       +---------+----------+
                 |
                 v
        Farmer Dashboard
```

### AI Integration

KisanShield AI uses Google's Gemini API for agricultural reasoning and visual crop-image screening.

The backend prepares available farmer context, such as crop type, growth stage, location, weather information, and market records, before sending relevant information to the AI model.

The system is designed to distinguish retrieved information from general AI-generated suggestions and avoid presenting uncertain diagnoses as confirmed facts.

---

## 📂 Project Structure

```text
kisanshield-ai/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── services/
│   │   │   ├── advisory.js
│   │   │   ├── geocoding.js
│   │   │   ├── gemini.js
│   │   │   └── mandi.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites

- Node.js 20 or newer
- npm
- Git
- Google Gemini API key
- Data.gov.in API key if required by your market-data configuration

### 1. Clone the Repository

```bash
git clone https://github.com/utkarshsingh2008/kisanshield-ai.git

cd kisanshield-ai
```

### 2. Install Dependencies

```bash
npm install
npm --prefix server install
npm --prefix client install
```

### 3. Configure Environment Variables

Create a `.env` file inside the `server/` directory.

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_supported_gemini_model

DATA_GOV_IN_API_KEY=your_data_gov_api_key
AGMARKNET_RESOURCE_ID=9ef84268-d588-465a-a308-a864a43d0070
```

For the frontend, create `client/.env`:

```env
VITE_API_URL=http://localhost:5000
```

**Important:** Never commit API keys or `.env` files to GitHub.

### 4. Run the Application

From the project root:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

Backend health endpoint:

```text
http://localhost:5000/api/health
```

---

## ☁️ Deployment

KisanShield AI uses separate Vercel projects for the frontend and backend.

### Frontend — Vercel

- Root Directory: `client`
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable:

```env
VITE_API_URL=https://kisanshield-ai-sigma.vercel.app
```

### Backend — Vercel

- Root Directory: `server`
- Runtime: Node.js
- Configure the required server environment variables.
- Set `CLIENT_ORIGIN` to:

```env
CLIENT_ORIGIN=https://kisanshield-ai-frontend.vercel.app
```

Do not expose server API keys through frontend environment variables.

---

## 🔐 Reliability & Responsible AI

- Weather forecasts are estimates, not guarantees.
- Market prices depend on the availability and freshness of external records.
- AI-generated crop guidance should be treated as decision support, not a replacement for agricultural experts.
- Image-based disease screening is preliminary and requires expert verification.
- The system avoids presenting unavailable or unverified information as confirmed facts.

---

## 🔮 Future Enhancements

- Voice-based farming assistance in regional Indian languages.
- Integration of soil health and sensor-based field data.
- Crop-specific disease detection with validated agricultural datasets.
- Government agricultural scheme discovery and eligibility guidance.
- Personalized crop planning and seasonal recommendations.
- Notifications for severe weather and important market changes.
- Offline-friendly support for low-connectivity farming regions.

---

## 🌍 Expected Impact

KisanShield AI aims to make agricultural information more accessible, actionable, and location-aware.

By bringing together weather intelligence, market information, and AI-powered crop guidance, the platform can support better-informed farming decisions, improve access to agricultural knowledge, and help farmers respond more effectively to changing field conditions.

---

## 👨‍💻 Project Information

**Project:** KisanShield AI  
**Category:** Artificial Intelligence | Agriculture | Climate Technology  
**Repository:** https://github.com/utkarshsingh2008/kisanshield-ai  
**Live Application:** https://kisanshield-ai-frontend.vercel.app/

### Built with the goal of making smarter farming decisions accessible to everyone. 🌱
