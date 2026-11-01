
export async function askGemini({
  prompt,
  image,
  mimeType,
  fallbackResponse
}) {
  const key = process.env.GEMINI_API_KEY;

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  // Default fallback response
  const defaultFallback = image
    ? "The crop image screening service is temporarily unavailable. Please try uploading the image again later. Do not apply treatment based on this unavailable analysis. Consult your local agriculture expert if symptoms are visible."
    : "I'm sorry, the AI farming assistant is temporarily unavailable. Please try again in a few moments. Meanwhile, check your local weather forecast and consult your nearest Krishi Vigyan Kendra (KVK) for important farming decisions.";

  const fallback = fallbackResponse || defaultFallback;

  if (!key) {
    return {
      text: fallback,
      model: "Default fallback",
      fallback: true
    };
  }

  const parts = [{ text: prompt }];

  if (image) {
    parts.push({
      inlineData: {
        mimeType,
        data: image
      }
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response;

    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              temperature: 0.35,
              maxOutputTokens: 1100
            }
          }),
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        response.status,
        body.error?.message
      );

      return {
        text: fallback,
        model: "Default fallback",
        fallback: true
      };
    }

    const text = body.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!text) {
      return {
        text: fallback,
        model: "Default fallback",
        fallback: true
      };
    }

    return {
      text,
      model,
      fallback: false
    };

  } catch (error) {
    console.error("Gemini connection error:", error.message);

    return {
      text: fallback,
      model: "Default fallback",
      fallback: true
    };
  }
}
