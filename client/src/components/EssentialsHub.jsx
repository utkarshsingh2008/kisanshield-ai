import { useEffect, useMemo, useRef, useState } from "react";
import {
  UserRound, Save, MessageCircle, Send, Mic, Volume2, Square,
  Store, Search, Camera, Upload, CalendarDays, Plus, Trash2,
  AlertCircle, CheckCircle2, LoaderCircle, Sprout, Droplets,
  FlaskConical, CalendarPlus, CloudRain
} from "lucide-react";
import { askAssistant, detectDisease, getMandiPrices } from "../lib/api";

const PROFILE_KEY = "kisanshield-farmer-profile";
const TASKS_KEY = "kisanshield-farm-tasks";
const SOIL_KEY = "kisanshield-soil-profile";
const SOWING_KEY = "kisanshield-sowing-date";

// Indicative planning windows only. Actual dates vary by variety, season,
// local agro-climatic zone and extension guidance.
const GENERIC_CROP_PLAN = { duration: 100, stages: [[0, "Establishment"], [20, "Vegetative growth"], [45, "Reproductive / flowering stage"], [70, "Fruit / grain development"], [90, "Maturity" ]], milestones: [[0, "Sowing / transplanting check"], [15, "Establishment and moisture check"], [35, "Vegetative-stage field inspection"], [55, "Flowering-stage monitoring"], [75, "Crop development and pest scouting"], [100, "Harvest window review"]] };
const CROP_PLANS = {
  rice: { duration: 120, stages: [[0, "Establishment"], [20, "Vegetative / tillering"], [55, "Panicle initiation"], [75, "Flowering"], [95, "Grain filling / maturity"]], milestones: [
    [0, "Sowing / transplanting check"], [7, "Establishment and water-level check"],
    [25, "Early vegetative-stage field inspection"], [45, "Tillering-stage nutrient review"],
    [65, "Panicle initiation monitoring"], [85, "Flowering-stage water-stress check"],
    [105, "Grain filling and drainage check"], [120, "Estimated harvest window review"]
  ] },
  wheat: { duration: 120, stages: [[0, "Germination / establishment"], [20, "Crown-root initiation"], [40, "Tillering"], [65, "Stem elongation / booting"], [85, "Flowering / grain filling"]], milestones: [
    [0, "Sowing and seedbed check"], [20, "Crown-root initiation irrigation review"],
    [40, "Tillering-stage field inspection"], [60, "Stem elongation and nutrient review"],
    [80, "Flowering-stage moisture check"], [100, "Grain filling and disease scouting"],
    [120, "Estimated harvest window review"]
  ] },
  maize: { duration: 100, stages: [[0, "Emergence"], [15, "Vegetative growth"], [40, "Tasseling / silking"], [60, "Kernel development"], [85, "Maturity"]], milestones: [
    [0, "Sowing and emergence check"], [15, "Seedling-stage weed and moisture check"],
    [30, "Vegetative-stage nutrient review"], [50, "Tasseling and silking moisture check"],
    [70, "Kernel development monitoring"], [100, "Estimated harvest window review"]
  ] },
  tomato: { duration: 90, stages: [[0, "Establishment"], [15, "Vegetative growth"], [30, "Flowering"], [45, "Fruit set / development"], [75, "Ripening / harvest"]], milestones: [
    [0, "Transplanting and establishment check"], [15, "Vegetative growth inspection"],
    [30, "Flowering and moisture check"], [45, "Fruit set and pest scouting"],
    [65, "Fruit development monitoring"], [90, "Harvest window review"]
  ] },
  potato: { duration: 100, stages: [[0, "Emergence"], [20, "Vegetative growth"], [40, "Tuber initiation"], [60, "Tuber bulking"], [85, "Maturity"]], milestones: [
    [0, "Planting and emergence check"], [20, "Emergence and earthing-up review"],
    [40, "Tuber initiation moisture check"], [60, "Tuber bulking monitoring"],
    [85, "Maturity and irrigation reduction review"], [100, "Harvest window review"]
  ] }
};

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
function todayString() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function normalizeCrop(crop) { return String(crop || "rice").toLowerCase(); }

export default function EssentialsHub({ selected, data, crop, stage, language }) {
  const [profile, setProfile] = useState(() => readJson(PROFILE_KEY, {
    name: "", farmSize: "", unit: "acre", village: "", district: "", state: "Bihar", preferredLanguage: "English"
  }));
  const [soil, setSoil] = useState(() => readJson(SOIL_KEY, { ph: "", moisture: "", nitrogen: "", phosphorus: "", potassium: "", notes: "" }));
  const [profileSaved, setProfileSaved] = useState(false);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const [mandiFilters, setMandiFilters] = useState({ state: "Bihar", district: "", commodity: crop || "Rice" });
  const [mandi, setMandi] = useState(null);
  const [mandiBusy, setMandiBusy] = useState(false);
  const [mandiError, setMandiError] = useState("");
  const [leafFile, setLeafFile] = useState(null);
  const [leafPreview, setLeafPreview] = useState("");
  const [diseaseResult, setDiseaseResult] = useState("");
  const [diseaseBusy, setDiseaseBusy] = useState(false);
  const [diseaseError, setDiseaseError] = useState("");
  const [tasks, setTasks] = useState(() => readJson(TASKS_KEY, []));
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [sowingDate, setSowingDate] = useState(() => localStorage.getItem(SOWING_KEY) || "");
  const [calendarNotice, setCalendarNotice] = useState("");

  useEffect(() => localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem(SOIL_KEY, JSON.stringify(soil)), [soil]);
  useEffect(() => { if (sowingDate) localStorage.setItem(SOWING_KEY, sowingDate); }, [sowingDate]);
  useEffect(() => () => {
    if (recognitionRef.current) recognitionRef.current.abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (leafPreview) URL.revokeObjectURL(leafPreview);
  }, [leafPreview]);

  const currentLocation = data?.location?.name || selected?.name || profile.village || "Not selected";
  const weatherContext = data ? {
    current: data.current,
    riskLevel: data.risk?.level,
    risks: data.risk?.risks,
    nextSevenDays: data.risk?.forecast?.slice(0, 7)
  } : null;
  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant")?.text || "";

  function saveProfile() {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(SOIL_KEY, JSON.stringify(soil));
    setProfileSaved(true);
    window.setTimeout(() => setProfileSaved(false), 2200);
  }

  function speak(text) {
    if (!text) return;
    if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance === "undefined") {
      setChatError("Speech output is not supported in this browser. Read the answer on screen.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const lang = profile.preferredLanguage || "English";
    utterance.lang = lang === "Hindi" || lang === "Bhojpuri" ? "hi-IN" : "en-IN";
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => { setIsSpeaking(false); setChatError("The browser could not play this response aloud."); };
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  function startVoiceInput() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setChatError("Speech recognition is unavailable. Use Google Chrome or type your question.");
      return;
    }
    if (recognitionRef.current) recognitionRef.current.abort();
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    const lang = profile.preferredLanguage || "English";
    recognition.lang = lang === "Hindi" || lang === "Bhojpuri" ? "hi-IN" : "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => { setIsListening(true); setChatError(""); };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript || "").join(" ");
      setQuestion(transcript.trim());
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      setChatError(event.error === "not-allowed" ? "Microphone permission was denied. Allow microphone access in Chrome site settings." : "Could not recognize speech. Please try again or type your question.");
    };
    recognition.onend = () => setIsListening(false);
    try { recognition.start(); } catch { setIsListening(false); setChatError("Microphone could not start. Try again."); }
  }

  async function sendQuestion(e) {
    e?.preventDefault();
    const text = question.trim();
    if (!text || chatBusy) return;
    const next = [...messages, { role: "user", text }];
    setMessages(next);
    setQuestion("");
    setChatError("");
    setChatBusy(true);
    try {
      const result = await askAssistant({
        question: text,
        language: profile.preferredLanguage || (language === "hi" ? "Hindi" : "English"),
        crop,
        growthStage: stage,
        location: currentLocation,
        weather: weatherContext,
        soil,
        farmerProfile: { farmSize: profile.farmSize, unit: profile.unit, village: profile.village, district: profile.district, state: profile.state },
        mandiContext: mandi?.records?.slice(0, 8) || [],
        history: messages.slice(-8).map((m) => ({ role: m.role === "assistant" ? "model" : "user", text: m.text }))
      });
      const updated = [...next, { role: "assistant", text: result.answer }];
      setMessages(updated);
    } catch (error) {
      setChatError(error.message || "The farming assistant could not respond.");
    } finally { setChatBusy(false); }
  }

  async function loadMandi(e) {
    e?.preventDefault();
    setMandiBusy(true); setMandiError(""); setMandi(null);
    try {
      const result = await getMandiPrices(mandiFilters);
      setMandi(result);
      if (!result.records.length) setMandiError("No records matched these filters. Try another district or commodity.");
    } catch (error) { setMandiError(error.message); }
    finally { setMandiBusy(false); }
  }

  function selectLeaf(file) {
    if (leafPreview) URL.revokeObjectURL(leafPreview);
    setLeafFile(file || null); setDiseaseResult(""); setDiseaseError("");
    if (!file) { setLeafPreview(""); return; }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setLeafFile(null); setLeafPreview(""); setDiseaseError("Use a JPG, PNG or WEBP image."); return; }
    if (file.size > 5 * 1024 * 1024) { setLeafFile(null); setLeafPreview(""); setDiseaseError("Image must be 5 MB or smaller."); return; }
    setLeafPreview(URL.createObjectURL(file));
  }

  async function analyzeLeaf() {
    if (!leafFile) return;
    setDiseaseBusy(true); setDiseaseError(""); setDiseaseResult("");
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("Could not read the selected image."));
        reader.readAsDataURL(leafFile);
      });
      const result = await detectDisease({ image: base64, mimeType: leafFile.type, crop, language: profile.preferredLanguage || "English" });
      setDiseaseResult(result.analysis);
    } catch (error) { setDiseaseError(error.message); }
    finally { setDiseaseBusy(false); }
  }

  function addTask(e) {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDate) return;
    setTasks((old) => [...old, { id: crypto.randomUUID(), title: taskTitle.trim(), date: taskDate, source: "farmer" }].sort((a,b) => a.date.localeCompare(b.date)));
    setTaskTitle(""); setTaskDate(""); setCalendarNotice("Reminder added.");
  }

  const sortedTasks = useMemo(() => [...tasks].sort((a,b) => a.date.localeCompare(b.date)), [tasks]);
  const cropPlanIsGeneric = !CROP_PLANS[normalizeCrop(crop)];
  const cropPlan = CROP_PLANS[normalizeCrop(crop)] || GENERIC_CROP_PLAN;
  const estimatedHarvest = sowingDate ? addDays(sowingDate, cropPlan.duration) : "";
  const cropDaysElapsed = sowingDate ? Math.max(0, Math.floor((new Date(`${todayString()}T12:00:00`) - new Date(`${sowingDate}T12:00:00`)) / 86400000)) : null;
  const currentCropStage = cropDaysElapsed === null ? "Select sowing date" : cropDaysElapsed >= cropPlan.duration ? "Estimated harvest window" : [...cropPlan.stages].reverse().find(([day]) => cropDaysElapsed >= day)?.[1] || cropPlan.stages[0][1];
  const forecastRainNext3 = (data?.risk?.forecast || []).slice(0, 3).reduce((sum, day) => sum + Number(day.rain || 0), 0);

  function createCropSchedule() {
    if (!sowingDate) { setCalendarNotice("Select the sowing or transplanting date first."); return; }
    const generated = cropPlan.milestones.map(([offset, title]) => ({
      id: crypto.randomUUID(), title: `${crop}: ${title}`, date: addDays(sowingDate, offset), source: "crop-plan"
    }));
    setTasks((old) => {
      const existing = new Set(old.map((task) => `${task.date}|${task.title}`));
      return [...old, ...generated.filter((task) => !existing.has(`${task.date}|${task.title}`))].sort((a,b) => a.date.localeCompare(b.date));
    });
    setCalendarNotice(`${cropPlanIsGeneric ? "Generic" : "Indicative"} ${crop} schedule added. Confirm dates with local KVK guidance.`);
  }

  function prepareIrrigationQuestion() {
    const moistureText = soil.moisture ? `${soil.moisture}% farmer-entered soil moisture` : "soil moisture not provided";
    const rainText = data?.risk?.forecast?.length ? `${forecastRainNext3.toFixed(1)} mm total forecast rainfall over the next three days` : "no live forecast loaded";
    setQuestion(`For my ${crop} crop at ${currentLocation}, growth stage ${stage}, should I irrigate now? Consider ${moistureText}, ${rainText}, and the available weather forecast. Explain what I should check in the field before deciding.`);
  }

  function createWeatherTasks() {
    const forecast = data?.risk?.forecast || [];
    if (!forecast.length) { setCalendarNotice("Generate a live field report before creating weather-based reminders."); return; }
    const suggestions = [];
    forecast.forEach((day) => {
      const rain = Number(day.rain || 0);
      const probability = Number(day.rainProbability || 0);
      const maxTemp = Number(day.maxTemp || 0);
      if (rain >= 20 || probability >= 75) suggestions.push({
        id: crypto.randomUUID(), date: day.date,
        title: `Weather check: inspect drainage before forecast rain (${rain.toFixed(1)} mm, ${probability}% chance)`, source: "weather"
      });
      if (maxTemp >= 38) suggestions.push({
        id: crypto.randomUUID(), date: day.date,
        title: `Heat alert: check crop stress and soil moisture (${maxTemp.toFixed(1)}°C forecast)`, source: "weather"
      });
    });
    if (!suggestions.length) { setCalendarNotice("No high-rainfall or heat threshold was detected in the current 7-day forecast."); return; }
    setTasks((old) => {
      const existing = new Set(old.map((task) => `${task.date}|${task.title}`));
      return [...old, ...suggestions.filter((task) => !existing.has(`${task.date}|${task.title}`))].sort((a,b) => a.date.localeCompare(b.date));
    });
    setCalendarNotice(`${suggestions.length} weather-related reminder(s) added. Review each before acting.`);
  }

  return (
    <section className="essentials-hub">
      <div className="hub-heading"><span className="step-label">FARMER TOOLKIT</span><h2>Your farm, connected</h2><p>Personal tools for your farm profile, decisions, markets and field observations.</p></div>
      <div className="hub-grid">
        <article className="hub-card profile-card">
          <div className="hub-card-title"><span className="hub-icon"><UserRound size={19}/></span><div><h3>Farmer profile & soil health</h3><p>Saved on this device · Soil values are farmer-entered</p></div></div>
          <div className="profile-grid">
            <label>Farmer name<input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Your name"/></label>
            <label>Farm size<input type="number" min="0" step="0.1" value={profile.farmSize} onChange={e=>setProfile({...profile,farmSize:e.target.value})} placeholder="e.g. 2.5"/></label>
            <label>Unit<select value={profile.unit} onChange={e=>setProfile({...profile,unit:e.target.value})}><option>acre</option><option>hectare</option><option>bigha</option></select></label>
            <label>Village / town<input value={profile.village} onChange={e=>setProfile({...profile,village:e.target.value})} placeholder="Village or town"/></label>
            <label>District<input value={profile.district} onChange={e=>setProfile({...profile,district:e.target.value})} placeholder="District"/></label>
            <label>State<input value={profile.state} onChange={e=>setProfile({...profile,state:e.target.value})} placeholder="State"/></label>
            <label>Preferred language<select value={profile.preferredLanguage} onChange={e=>setProfile({...profile,preferredLanguage:e.target.value})}><option>English</option><option>Hindi</option><option>Bhojpuri</option></select></label>
          </div>
          <div className="soil-panel">
            <div className="soil-heading"><FlaskConical size={15}/> <strong>Soil information (optional)</strong></div>
            <div className="soil-grid">
              <label>Soil pH<input type="number" min="0" max="14" step="0.1" value={soil.ph} onChange={e=>setSoil({...soil,ph:e.target.value})} placeholder="e.g. 6.5"/></label>
              <label>Moisture %<input type="number" min="0" max="100" step="1" value={soil.moisture} onChange={e=>setSoil({...soil,moisture:e.target.value})} placeholder="e.g. 35"/></label>
              <label>Nitrogen<input value={soil.nitrogen} onChange={e=>setSoil({...soil,nitrogen:e.target.value})} placeholder="Value / unknown"/></label>
              <label>Phosphorus<input value={soil.phosphorus} onChange={e=>setSoil({...soil,phosphorus:e.target.value})} placeholder="Value / unknown"/></label>
              <label>Potassium<input value={soil.potassium} onChange={e=>setSoil({...soil,potassium:e.target.value})} placeholder="Value / unknown"/></label>
            </div>
            <small>Enter results from a soil test or a suitable meter. Leave unknown values blank; do not guess.</small>
          </div>
          <button className="hub-primary" onClick={saveProfile}><Save size={15}/> Save farmer & soil profile</button>
          {profileSaved && <span className="hub-success"><CheckCircle2 size={14}/> Profile saved</span>}
          <p className="hub-footnote">Profile and soil information are stored in this browser only. This MVP does not use live soil sensors or provide laboratory soil testing.</p>
        </article>

        <article className="hub-card assistant-card">
          <div className="hub-card-title"><span className="hub-icon"><MessageCircle size={19}/></span><div><h3>AI farming assistant</h3><p>Text and voice-based crop guidance</p></div><span className="provider-tag">Gemini</span></div>
          <div className="chat-context">Context: {crop} · {stage} · {currentLocation} · Soil {soil.ph ? `pH ${soil.ph}` : "not entered"} · Moisture {soil.moisture ? `${soil.moisture}%` : "not entered"}</div>
          <div className="chat-messages">
            {messages.length === 0 && <div className="chat-empty">Try asking: “Mere khet mein baarish hone wali hai, kya mujhe paani dena chahiye?”</div>}
            {messages.map((message, index) => <div key={index} className={`chat-bubble ${message.role}`}>{message.text}{message.role === "assistant" && <button className="speak-button" onClick={()=>speak(message.text)} title="Listen to this answer"><Volume2 size={14}/></button>}</div>)}
            {chatBusy && <div className="chat-bubble assistant"><LoaderCircle className="spin" size={15}/> Thinking...</div>}
          </div>
          <form className="chat-form" onSubmit={sendQuestion}>
            <input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask or dictate your farming question..." maxLength={1800}/>
            <button type="button" className={`icon-action ${isListening ? "recording" : ""}`} onClick={startVoiceInput} title="Speak your question"><Mic size={17}/></button>
            <button type="submit" className="send-action" disabled={chatBusy || !question.trim()}><Send size={16}/></button>
          </form>
          <div className="voice-actions">
            <button type="button" className="voice-secondary" onClick={startVoiceInput} disabled={isListening}><Mic size={14}/>{isListening ? "Listening…" : "Speak your question"}</button>
            <button type="button" className="voice-secondary" onClick={()=>speak(latestAssistantMessage)} disabled={!latestAssistantMessage || isSpeaking}><Volume2 size={14}/>Listen to AI response</button>
            {isSpeaking && <button type="button" className="voice-stop" onClick={stopSpeaking}><Square size={12}/> Stop</button>}
          </div>
          {chatError && <p className="hub-error"><AlertCircle size={14}/>{chatError}</p>}
          <p className="hub-footnote">Voice recognition depends on browser support and microphone permission. Hindi speech is used as the fallback for Bhojpuri. AI guidance is advisory; verify high-impact decisions with your local KVK or agriculture officer.</p>
        </article>

        <article className="hub-card mandi-card">
          <div className="hub-card-title"><span className="hub-icon"><Store size={19}/></span><div><h3>Mandi price intelligence</h3><p>Official market price records</p></div><span className="provider-tag">AGMARKNET</span></div>
          <form className="mandi-form" onSubmit={loadMandi}>
            <label>State<input value={mandiFilters.state} onChange={e=>setMandiFilters({...mandiFilters,state:e.target.value})} placeholder="e.g. Bihar"/></label>
            <label>District<input value={mandiFilters.district} onChange={e=>setMandiFilters({...mandiFilters,district:e.target.value})} placeholder="Optional district"/></label>
            <label>Commodity<input value={mandiFilters.commodity} onChange={e=>setMandiFilters({...mandiFilters,commodity:e.target.value})} placeholder="e.g. Maize"/></label>
            <button className="hub-primary" disabled={mandiBusy}>{mandiBusy ? <LoaderCircle className="spin" size={15}/> : <Search size={15}/>} Find market prices</button>
          </form>
          {mandiError && <p className="hub-error"><AlertCircle size={14}/>{mandiError}</p>}
          {mandi?.records?.length > 0 && <div className="table-scroll"><table className="mandi-table"><thead><tr><th>Market</th><th>Commodity</th><th>Min ₹/q</th><th>Modal ₹/q</th><th>Max ₹/q</th><th>Date</th></tr></thead><tbody>{mandi.records.map((r,i)=><tr key={`${r.market}-${i}`}><td>{r.market}<small>{r.district}</small></td><td>{r.commodity}<small>{r.variety}</small></td><td>{Number.isFinite(r.minPrice)?r.minPrice:"—"}</td><td><strong>{Number.isFinite(r.modalPrice)?r.modalPrice:"—"}</strong></td><td>{Number.isFinite(r.maxPrice)?r.maxPrice:"—"}</td><td>{r.date || "—"}</td></tr>)}</tbody></table></div>}
          <p className="hub-footnote">Prices are wholesale ₹ per quintal where provided. Retrieved records can be included in the AI context; verify date and market before selling decisions.</p>
        </article>

        <article className="hub-card disease-card">
          <div className="hub-card-title"><span className="hub-icon"><Camera size={19}/></span><div><h3>AI crop image screening</h3><p>Preliminary visible symptom analysis</p></div><span className="provider-tag">Gemini Vision</span></div>
          <label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>selectLeaf(e.target.files?.[0])}/>{leafPreview ? <img src={leafPreview} alt="Selected crop leaf"/> : <><Upload size={25}/><strong>Upload a crop leaf photo</strong><span>JPG, PNG or WEBP · up to 5 MB</span></>}</label>
          <button className="hub-primary" disabled={!leafFile || diseaseBusy} onClick={analyzeLeaf}>{diseaseBusy ? <LoaderCircle className="spin" size={15}/> : <Search size={15}/>} Analyze visible symptoms</button>
          {diseaseError && <p className="hub-error"><AlertCircle size={14}/>{diseaseError}</p>}
          {diseaseResult && <div className="disease-result"><strong>Preliminary AI screening</strong><p>{diseaseResult}</p></div>}
          <p className="hub-footnote">A photo cannot confirm disease. Ask a local agriculture expert to verify before applying any treatment.</p>
        </article>

        <article className="hub-card calendar-card">
          <div className="hub-card-title"><span className="hub-icon"><CalendarDays size={19}/></span><div><h3>Crop calendar & smart scheduling</h3><p>Indicative growth milestones and weather-aware reminders</p></div></div>
          <div className="calendar-setup">
            <label>Crop used for schedule<input value={crop || "Rice"} readOnly/></label>
            <label>Sowing / transplanting date<input type="date" value={sowingDate} onChange={e=>setSowingDate(e.target.value)}/></label>
          </div>
          {sowingDate && <div className="stage-tracker"><div><strong>Estimated current growth stage</strong><span>Day {cropDaysElapsed} of approximately {cropPlan.duration}</span></div><b>{currentCropStage}</b><div className="stage-track"><i style={{ width: `${Math.min(100, cropDaysElapsed / cropPlan.duration * 100)}%` }}/></div></div>}
          {estimatedHarvest && <div className="harvest-estimate"><Sprout size={15}/> Estimated harvest window starts around <strong>{new Date(`${estimatedHarvest}T12:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</strong><small>{cropPlanIsGeneric ? "Generic planning template" : `Indicative ${cropPlan.duration}-day crop estimate`}; actual duration varies by variety and region.</small></div>}
          <div className="irrigation-planner">
            <div><Droplets size={16}/><strong>Weather-aware irrigation check</strong></div>
            <p>{data?.risk?.forecast?.length ? `Forecast rainfall over the next 3 days: ${forecastRainNext3.toFixed(1)} mm.` : "Generate a field report to load the local rainfall forecast."} {soil.moisture ? `Entered soil moisture: ${soil.moisture}%.` : "Add soil moisture if you have a measured value."}</p>
            <button type="button" className="hub-outline" onClick={prepareIrrigationQuestion}><MessageCircle size={14}/> Ask AI whether to irrigate</button>
          </div>
          <div className="calendar-actions">
            <button type="button" className="hub-primary" onClick={createCropSchedule}><CalendarPlus size={14}/> Generate crop schedule</button>
            <button type="button" className="hub-outline" onClick={createWeatherTasks} disabled={!data?.risk?.forecast?.length}><CloudRain size={14}/> Add weather reminders</button>
          </div>
          {calendarNotice && <p className="calendar-notice"><CheckCircle2 size={13}/>{calendarNotice}</p>}
          <form className="task-form" onSubmit={addTask}>
            <input value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} placeholder="Add a custom farm activity"/>
            <input type="date" value={taskDate} min={todayString()} onChange={e=>setTaskDate(e.target.value)}/>
            <button className="hub-primary" type="submit" disabled={!taskTitle.trim() || !taskDate}><Plus size={15}/> Add reminder</button>
          </form>
          <div className="task-list">
            {sortedTasks.length === 0 && <p className="chat-empty">No reminders yet. Generate a crop schedule or add an activity.</p>}
            {sortedTasks.map(task=><div className="task-row" key={task.id}><CalendarDays size={16}/><span><strong>{task.title}</strong><small>{new Date(`${task.date}T00:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})} · {task.source === "weather" ? "Weather suggestion" : task.source === "crop-plan" ? "Indicative crop plan" : "Farmer reminder"}</small></span><button onClick={()=>setTasks(old=>old.filter(t=>t.id!==task.id))} title="Delete reminder"><Trash2 size={15}/></button></div>)}
          </div>
          <p className="hub-footnote">Schedule windows are generic planning aids, not official prescriptions. Confirm sowing, irrigation and fertilizer timing for your variety and district with KVK or state agriculture guidance. Weather reminders are based on the currently loaded 7-day forecast.</p>
        </article>
      </div>
    </section>
  );
}
