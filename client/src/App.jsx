import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, ArrowUpRight, CloudRain, Droplets,
  Leaf, LoaderCircle, MapPin, Search, ShieldCheck, Sprout, Sun, Wind,
  Languages, RefreshCw, Thermometer, CheckCircle2, Info
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { findLocations, getAdvisory } from "./lib/api";
import EssentialsHub from "./components/EssentialsHub.jsx";

const CROPS = ["Rice", "Wheat", "Maize", "Cotton", "Tomato", "Potato", "Mustard", "Sugarcane", "Soybean", "Groundnut"];
const STAGES = ["Sowing", "Seedling", "Vegetative", "Flowering", "Fruiting / Grain filling", "Harvesting"];

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}
function weatherLabel(code) {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Variable conditions";
}
function RiskPill({ level }) {
  return <span className={`risk-pill ${String(level).toLowerCase()}`}>{level} risk</span>;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [crop, setCrop] = useState("Rice");
  const [stage, setStage] = useState("Vegetative");
  const [language, setLanguage] = useState("en");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");
  const searchTimer = useRef(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setLocations([]);
      setSearchError("");
      return;
    }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await findLocations(query.trim());
        setSearchError("");
        setLocations(result.locations || []);
        setSearchError(result.locations?.length ? "" : "No matching locations found.");
      } catch (err) {
        setSearchError(err.message);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  async function generate() {
    if (!selected) {
      setError("Search and select a location first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await getAdvisory({
        latitude: selected.latitude,
        longitude: selected.longitude,
        locationName: selected.name,
        country: selected.country,
        crop,
        growthStage: stage,
        language
      });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(() => data?.risk?.forecast?.map((day) => ({
    day: new Date(`${day.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" }),
    temperature: day.maxTemp,
    rainfall: day.rain
  })) || [], [data]);

  const current = data?.current;
  const risk = data?.risk;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-icon"><Sprout size={22} /></span>
          <span>KisanShield<span className="brand-ai"> AI</span><small>WEATHER-SMART FARMING</small></span>
        </a>
        <div className="topbar-right">
          <span className="live-status"><span /> Live data enabled</span>
          <button type="button" className="language-button" onClick={() => setLanguage(language === "en" ? "hi" : "en")}>
            <Languages size={16} /> {language === "en" ? "English" : "हिन्दी"}
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span /> CLIMATE INTELLIGENCE FOR EVERY FARM</div>
            <h1>Make every farming<br /><em>decision weather-smart.</em></h1>
            <p>Live local forecasts, early risk signals, and practical crop guidance — all in one place.</p>
          </div>
          <div className="hero-mark"><div className="sun-disc"><Sun size={48} /></div><div className="orbit orbit-one" /><div className="orbit orbit-two" /><Leaf className="hero-leaf" size={38} /></div>
        </section>

        <section className="control-panel">
          <div className="panel-heading">
            <div><span className="step-label">PERSONALIZED FIELD REPORT</span><h2>Tell us about your farm</h2></div>
            <span className="secure-label"><ShieldCheck size={15} /> No account needed</span>
          </div>
          <div className="form-grid">
            <div className="field location-field">
              <label><MapPin size={15} /> FARM LOCATION</label>
              <div className="search-wrap">
                <Search size={17} />
                <input aria-label="Farm location" value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} placeholder="Search village, town or city..." />
                {searching && <LoaderCircle className="spin" size={17} />}
                {locations.length > 0 && !selected && (
                  <div className="suggestions">
                    {locations.map((place) => (
                      <button key={place.id} onClick={() => { setSelected(place); setQuery(place.label); setLocations([]); setSearchError(""); }}>
                        <MapPin size={15} /><span>{place.name}<small>{[place.admin1, place.country].filter(Boolean).join(", ")}</small></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selected && <small className="field-hint selected-hint"><CheckCircle2 size={13} /> {selected.label}</small>}
              {searchError && !selected && <small className="field-hint">{searchError}</small>}
            </div>
            <div className="field">
              <label><Sprout size={15} /> YOUR CROP</label>
              <select value={crop} onChange={(e) => setCrop(e.target.value)}>{CROPS.map((item) => <option key={item}>{item}</option>)}</select>
            </div>
            <div className="field">
              <label><Activity size={15} /> GROWTH STAGE</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)}>{STAGES.map((item) => <option key={item}>{item}</option>)}</select>
            </div>
            <button type="button" className="generate-button" onClick={generate} disabled={loading || !selected}>
              {loading ? <><LoaderCircle className="spin" size={18} /> Analyzing...</> : <>Generate field report <ArrowUpRight size={18} /></>}
            </button>
          </div>
          {error && <div className="error-message" role="alert"><AlertTriangle size={16} /> {error}</div>}
        </section>

        {!data && !loading && (
          <section className="empty-state">
            <div className="empty-icon"><CloudRain size={28} /></div>
            <h3>Your farm intelligence starts here</h3>
            <p>Choose a location, crop and growth stage, then generate your first live field report.</p>
            <div className="empty-features"><span><CheckCircle2 size={15} /> Live weather</span><span><CheckCircle2 size={15} /> Risk assessment</span><span><CheckCircle2 size={15} /> AI recommendations</span></div>
          </section>
        )}

        {loading && <div className="loading-state" role="status" aria-live="polite"><LoaderCircle className="spin" size={30} /><strong>Analyzing your farm conditions</strong><span>Fetching live forecast and preparing crop-specific guidance...</span></div>}

        {data && !loading && (
          <div className="results">
            <div className="report-heading">
              <div><span className="step-label">YOUR FIELD REPORT</span><h2>{data.location.name}{data.location.country ? `, ${data.location.country}` : ""}</h2><p><MapPin size={14} /> {data.location.latitude.toFixed(2)}°, {data.location.longitude.toFixed(2)}° · {data.location.timezone}</p></div>
              <button type="button" className="refresh-button" onClick={generate}><RefreshCw size={15} /> Refresh report</button>
            </div>

            <div className="metric-grid">
              <div className="metric-card weather-card"><div className="metric-top"><span>CURRENT TEMPERATURE</span><Thermometer size={17} /></div><strong>{Math.round(current.temperature_2m)}°<small>C</small></strong><p>{weatherLabel(current.weather_code)}</p><div className="metric-foot">Feels like current air temperature</div></div>
              <div className="metric-card"><div className="metric-top"><span>HUMIDITY</span><Droplets size={17} /></div><strong>{Math.round(current.relative_humidity_2m)}<small>%</small></strong><p>Relative humidity</p><div className="metric-foot">Current observation</div></div>
              <div className="metric-card"><div className="metric-top"><span>WIND SPEED</span><Wind size={17} /></div><strong>{Math.round(current.wind_speed_10m)}<small> km/h</small></strong><p>Near-surface wind</p><div className="metric-foot">Current observation</div></div>
              <div className="metric-card"><div className="metric-top"><span>PRECIPITATION</span><CloudRain size={17} /></div><strong>{Number(current.precipitation).toFixed(1)}<small> mm</small></strong><p>Current precipitation</p><div className="metric-foot">At selected coordinates</div></div>
            </div>

            <section className="risk-section">
              <div className="section-title"><div><span className="step-label">FORECAST-BASED ANALYSIS</span><h2>Weather risk assessment</h2></div><RiskPill level={risk.level} /></div>
              <div className="risk-summary"><div className={`risk-score ${risk.level.toLowerCase()}`}><strong>{risk.score}</strong><small>/100</small></div><div><strong>{risk.summary}</strong><p>Heuristic score based on the next 7 days of forecast data. It is an indicator, not an official warning.</p></div></div>
              {risk.risks.length > 0 ? <div className="risk-list">{risk.risks.map((item) => <div className="risk-item" key={item.type}><AlertTriangle size={17} /><div><strong>{item.type}</strong><small>{item.explanation}</small></div><span>{item.value}</span><RiskPill level={item.level} /></div>)}</div> : <div className="no-risk"><ShieldCheck size={18} /> No configured high or moderate risk thresholds were crossed.</div>}
            </section>

            <div className="content-grid">
              <section className="chart-card">
                <div className="section-title"><div><span className="step-label">NEXT 7 DAYS</span><h2>Temperature outlook</h2></div><span className="chart-unit">°C · Daily maximum</span></div>
                <div className="chart-wrap"><ResponsiveContainer width="100%" height={230}><AreaChart data={chartData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#75ae7f" stopOpacity={0.28}/><stop offset="100%" stopColor="#75ae7f" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9eee7"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#78877b", fontSize: 12 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#78877b", fontSize: 12 }}/><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e6ece4", fontSize: 12 }}/><Area type="monotone" dataKey="temperature" name="Max temperature" stroke="#43875b" strokeWidth={2.5} fill="url(#tempFill)" /></AreaChart></ResponsiveContainer></div>
                <div className="forecast-list">{data.risk.forecast.map((day) => <div className="forecast-day" key={day.date}><span>{formatDate(day.date)}</span><Sun size={16}/><strong>{Math.round(day.maxTemp)}°</strong><small><CloudRain size={12}/> {Number(day.rain).toFixed(1)} mm</small><small>{day.rainProbability ?? "—"}% rain chance</small></div>)}</div>
              </section>

              <section className="advisory-card">
                <div className="advisory-header"><div className="advisory-icon"><Sprout size={21}/></div><div><span className="step-label">PERSONALIZED CROP GUIDANCE</span><h2>AI field advisor</h2></div></div>
                <div className="ai-status"><span className={data.advice.aiMode === "live" ? "status-dot live" : "status-dot"} />{data.advice.aiMode === "live" ? `Generated with ${data.advice.aiModel}` : "Rule-based fallback guidance"}</div>
                <h3>{data.advice.title}</h3><p className="advice-summary">{data.advice.summary}</p>
                <div className="advice-block"><h4><CheckCircle2 size={16}/> Recommended actions</h4><ul>{data.advice.actions.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
                {data.advice.avoid?.length > 0 && <div className="advice-block avoid-block"><h4><AlertTriangle size={16}/> Be cautious</h4><ul>{data.advice.avoid.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
                <div className="irrigation-note"><Droplets size={17}/><div><strong>Irrigation guidance</strong><p>{data.advice.irrigation}</p></div></div>
                <p className="safety-note"><Info size={14}/>{data.advice.safetyNote}</p>
              </section>
            </div>

            <div className="source-note"><Info size={15}/><span>Weather source: Open-Meteo · Report generated {new Date(data.generatedAt).toLocaleString("en-IN")} · Forecast values can change as new model runs arrive.</span></div>
          </div>
        )}
        <EssentialsHub selected={selected} data={data} crop={crop} stage={stage} language={language} />
      </main>
      <footer><span>© 2026 KisanShield AI</span><span>Built for smarter, more resilient agriculture.</span></footer>
    </div>
  );
}
