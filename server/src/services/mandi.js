const RESOURCE_ID = process.env.AGMARKNET_RESOURCE_ID || "9ef84268-d588-465a-a308-a864a43d0070";

export async function getMandiPrices({ state, district, commodity }) {
  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  if (!apiKey) {
    const error = new Error("Mandi prices need a data.gov.in API key. Add DATA_GOV_IN_API_KEY to server/.env.");
    error.status = 503;
    throw error;
  }

  const url = new URL(`https://api.data.gov.in/resource/${RESOURCE_ID}`);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "100");
  if (state) url.searchParams.set("filters[state]", state);
  if (district) url.searchParams.set("filters[district]", district);
  if (commodity) url.searchParams.set("filters[commodity]", commodity);

  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Mandi data provider returned ${response.status}.`);
    error.status = response.status;
    throw error;
  }

  const records = (payload.records || []).map((row) => ({
    state: row.state || row.State || "",
    district: row.district || row.District || "",
    market: row.market || row.Market || "",
    commodity: row.commodity || row.Commodity || "",
    variety: row.variety || row.Variety || "",
    date: row.arrival_date || row.Arrival_Date || row.date || "",
    minPrice: Number(row.min_price ?? row.Min_Price),
    maxPrice: Number(row.max_price ?? row.Max_Price),
    modalPrice: Number(row.modal_price ?? row.Modal_Price)
  })).filter((row) => row.market && row.commodity);

  return {
    records,
    count: records.length,
    source: "AGMARKNET via data.gov.in",
    updatedAt: new Date().toISOString()
  };
}
