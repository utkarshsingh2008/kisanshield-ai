import "dotenv/config";
import express from "express";
import cors from "cors";
import { searchLocations } from "./services/geocoding.js";
import { createAdvisory } from "./services/advisory.js";
import { askGemini } from "./services/gemini.js";
import { getMandiPrices } from "./services/mandi.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(",").map((item) => item.trim())
    : true
}));
app.use(express.json({ limit: "9mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "KisanShield AI API" });
});

app.get("/api/locations", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (query.length < 2) return res.status(400).json({ error: "Enter at least two characters." });
    res.json({ locations: await searchLocations(query) });
  } catch (error) {
    res.status(502).json({ error: error.message || "Location search failed." });
  }
});

app.post("/api/advisory", async (req, res) => {
  try {
    const { latitude, longitude, locationName, country, crop, growthStage, language } = req.body || {};
    const lat = Number(latitude), lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: "A valid location is required." });
    }
    if (!crop || !growthStage) return res.status(400).json({ error: "Please select a crop and its growth stage." });
    res.json(await createAdvisory({
      latitude: lat, longitude: lon,
      locationName: String(locationName || "Selected location").slice(0, 120),
      country: String(country || "").slice(0, 80),
      crop: String(crop).slice(0, 60),
      growthStage: String(growthStage).slice(0, 60),
      language: language === "hi" ? "Hindi" : "English"
    }));
  } catch (error) {
    console.error("Advisory error:", error.message);
    res.status(502).json({ error: error.message || "Could not generate the advisory." });
  }
});

app.post("/api/assistant", async (req, res) => {
  try {
    const { question, language = "English", crop = "unspecified", growthStage = "unspecified", location = "unspecified", weather = null, soil = null, farmerProfile = null, mandiContext = [], history = [] } = req.body || {};
    if (!String(question || "").trim()) return res.status(400).json({ error: "Ask a farming question first." });
    if (String(question).length > 1800) return res.status(400).json({ error: "Please keep your question under 1,800 characters." });

    const safeHistory = Array.isArray(history) ? history.slice(-6).map((m) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: String(m.text || "").slice(0, 1200) }]
    })) : [];

    const prompt = [
      "You are KisanShield, a cautious agricultural information assistant for Indian farmers.",
      `Answer in ${language}.`,
      `Farmer context: crop=${crop}; growth stage=${growthStage}; location=${location}.`,
      `Available live weather context: ${weather ? JSON.stringify(weather).slice(0, 3000) : "not supplied"}.`,
      `Farmer-entered soil information (not sensor-verified): ${soil ? JSON.stringify(soil).slice(0, 1000) : "not supplied"}.`,
      `Farmer profile context: ${farmerProfile ? JSON.stringify(farmerProfile).slice(0, 800) : "not supplied"}.`,
      `Official mandi records retrieved by the app (may be empty): ${Array.isArray(mandiContext) ? JSON.stringify(mandiContext.slice(0, 8)).slice(0, 2200) : "not supplied"}.`,
      "Give practical, concise, safe guidance. Use supplied weather, soil and mandi context when relevant, and explicitly say when a data source is missing or stale. Distinguish verified facts from general suggestions. Do not invent live mandi prices, government scheme eligibility, soil values, or weather observations. Do not prescribe pesticide brands, chemical dosages, or unsafe mixtures. For diagnosis or high-stakes crop loss decisions, recommend local KVK/agriculture officer verification.",
      `Recent conversation: ${safeHistory.map((m) => `${m.role}: ${m.parts[0].text}`).join("\\n") || "New conversation"}.`,
      `Farmer question: ${String(question).trim()}`
    ].join("\\n");

    const result = await askGemini({ prompt });
    res.json({ answer: result.text, model: result.model, language });
  } catch (error) {
    res.status(502).json({ error: error.message || "AI assistant is unavailable." });
  }
});

app.post("/api/disease-detect", async (req, res) => {
  try {
    const { image, mimeType, crop = "unknown", language = "English" } = req.body || {};
    if (!image || !mimeType) return res.status(400).json({ error: "Upload a crop leaf image first." });
    if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      return res.status(400).json({ error: "Use a JPG, PNG or WEBP image." });
    }
    if (image.length > 7_000_000) return res.status(413).json({ error: "Image is too large. Choose an image under approximately 5 MB." });

    const prompt = `Analyze this crop leaf image as a preliminary visual screening only. Crop reported by farmer: ${crop}. Reply in ${language}. State: (1) visible symptoms only, (2) possible issue categories with confidence expressed cautiously, (3) what additional photo/context would help, (4) low-risk immediate prevention/containment steps, (5) why an agricultural expert or KVK should verify before any treatment. Do not claim a definitive diagnosis from one image. Do not recommend pesticide chemicals or dosages. If image quality is poor or no symptom is visible, say so clearly.`;
    const result = await askGemini({ prompt, image, mimeType });
    res.json({ analysis: result.text, model: result.model, disclaimer: "Image-based screening is not a confirmed diagnosis. Verify with a local agriculture expert before treatment." });
  } catch (error) {
    res.status(502).json({ error: error.message || "Image analysis failed." });
  }
});

app.get("/api/mandi", async (req, res) => {
  try {
    const state = String(req.query.state || "").slice(0, 80);
    const district = String(req.query.district || "").slice(0, 80);
    const commodity = String(req.query.commodity || "").slice(0, 80);
    res.json(await getMandiPrices({ state, district, commodity }));
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || "Could not retrieve mandi prices." });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error." });
});

app.listen(PORT, () => console.log(`KisanShield API running at http://localhost:${PORT}`));
