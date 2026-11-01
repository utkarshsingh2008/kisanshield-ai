function fallbackAdvice({ crop, growthStage, language, risk }) {
  const isHindi = language === "Hindi";
  const actions = risk.risks.length
    ? risk.risks.map((item) => isHindi
      ? `${item.type} (${item.level}) का पूर्वानुमान है। खेत की स्थिति देखें और स्थानीय कृषि सलाह के अनुसार आवश्यक सावधानी अपनाएं।`
      : `${item.type} (${item.level}) is indicated. Inspect field conditions and take precautions appropriate to your crop and local agricultural guidance.`)
    : [isHindi
      ? "अगले कुछ दिनों के मौसम की नियमित निगरानी करें और खेत की नमी के अनुसार काम तय करें।"
      : "Continue monitoring the forecast and make field decisions based on actual soil moisture and crop conditions."];

  return {
    title: isHindi ? `${crop} के लिए मौसम सलाह` : `Weather advisory for ${crop}`,
    summary: isHindi
      ? `${growthStage} अवस्था में ${crop} के लिए उपलब्ध पूर्वानुमान के आधार पर सावधानी बरतें।`
      : `For ${crop} at the ${growthStage} stage, use the forecast signals below to plan field activities.`,
    actions,
    avoid: isHindi
      ? ["बिना खेत की स्थिति जांचे सिंचाई या छिड़काव का निर्णय न लें।"]
      : ["Do not make irrigation or spraying decisions without checking actual field conditions."],
    irrigation: isHindi
      ? "मिट्टी की नमी और स्थानीय सलाह के आधार पर सिंचाई तय करें।"
      : "Base irrigation on soil moisture, crop stage, and local agronomic guidance.",
    safetyNote: isHindi
      ? "यह सामान्य मौसम-आधारित मार्गदर्शन है, विशेषज्ञ कृषि सलाह का विकल्प नहीं।"
      : "This is general weather-based guidance, not a substitute for advice from a local agricultural expert."
  };
}

function extractJson(content) {
  const cleaned = String(content || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI response was not valid JSON.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function generateAiAdvice(context) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { ...fallbackAdvice(context), aiMode: "fallback", aiMessage: "Add an OpenRouter API key to enable live AI-generated advice." };
  }

  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const promptData = {
    location: context.locationName,
    crop: context.crop,
    growthStage: context.growthStage,
    language: context.language,
    currentWeather: context.weather.current,
    riskAssessment: context.risk,
    nextSevenDays: context.risk.forecast
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
      "X-Title": "KisanShield AI"
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content: `You are a cautious agricultural weather advisory assistant. Use ONLY the supplied weather data. Do not invent soil, pest, disease, or crop facts. Do not claim certainty. Give practical, conservative actions tailored to the crop and growth stage. Never prescribe pesticide chemicals or dosages. If data is insufficient, say so. Respond in ${context.language}. Return ONLY valid JSON with keys: title (string), summary (string), actions (array of 3-5 strings), avoid (array of 1-3 strings), irrigation (string), safetyNote (string).`
        },
        {
          role: "user",
          content: `Create a practical crop protection advisory from this live data:\n${JSON.stringify(promptData)}`
        }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}). Check your API key, model and account credits. ${detail.slice(0, 180)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const parsed = extractJson(content);

  if (!parsed.title || !parsed.summary || !Array.isArray(parsed.actions)) {
    throw new Error("AI returned an incomplete advisory. Please try again.");
  }

  return {
    title: parsed.title,
    summary: parsed.summary,
    actions: parsed.actions.slice(0, 5),
    avoid: Array.isArray(parsed.avoid) ? parsed.avoid.slice(0, 3) : [],
    irrigation: parsed.irrigation || "Check soil moisture before irrigation.",
    safetyNote: parsed.safetyNote || "Confirm important decisions with a local agricultural expert.",
    aiMode: "live",
    aiModel: model
  };
}
