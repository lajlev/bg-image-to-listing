const xml2js = require("xml2js");

function getHeaders() {
  return { Authorization: `Bearer ${process.env.BGG_API_TOKEN}` };
}

async function searchBGG(gameName) {
  const url = `https://api.geekdo.com/xmlapi2/search?query=${encodeURIComponent(gameName)}&type=boardgame&exact=1`;
  const res = await fetch(url, { headers: getHeaders() });
  const xml = await res.text();
  console.log("[DEBUG] BGG XML Response (Exact):", xml);
  const parsed = await xml2js.parseStringPromise(xml);
  console.log("[DEBUG] BGG Parsed XML (Exact):", parsed);

  const items = parsed?.items?.item;
  if (!items || items.length === 0) {
    // Retry without exact match
    const url2 = `https://api.geekdo.com/xmlapi2/search?query=${encodeURIComponent(gameName)}&type=boardgame`;
    const res2 = await fetch(url2, { headers: getHeaders() });
    const xml2Text = await res2.text();
    console.log("[DEBUG] BGG XML Response (Non-Exact):", xml2Text);
    const parsed2 = await xml2js.parseStringPromise(xml2Text);
    console.log("[DEBUG] BGG Parsed XML (Non-Exact):", parsed2);
    const items2 = parsed2?.items?.item;
    if (!items2 || items2.length === 0) return null;
    return items2[0].$.id;
  }

  return items[0].$.id;
}

async function getGameDetails(bggId) {
  const url = `https://api.geekdo.com/xmlapi2/thing?id=${bggId}&stats=1`;
  const res = await fetch(url, { headers: getHeaders() });
  const xml = await res.text();
  const parsed = await xml2js.parseStringPromise(xml);

  const item = parsed?.items?.item?.[0];
  if (!item) return null;

  const description = (item.description?.[0] || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&#10;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Truncate to ~6 sentences
  const shortDesc = description.split(/\.\s+/).slice(0, 6).join(". ").trim();
  const finalDesc = shortDesc.endsWith(".") ? shortDesc : shortDesc + ".";

  const categories = (item.link || [])
    .filter((l) => l.$.type === "boardgamecategory")
    .map((l) => l.$.value);

  const yearPublished = item.yearpublished?.[0]?.$.value || "";

  const name = (item.name || []).find((n) => n.$.type === "primary")?.$.value || "";

  const thumbnail = item.thumbnail?.[0] || "";

  return {
    name,
    link: `https://boardgamegeek.com/boardgame/${bggId}`,
    description: finalDesc,
    category: categories.join(", ") || "",
    year_published: yearPublished,
    thumbnail,
  };
}

async function lookupBGG(gameName) {
  const bggId = await searchBGG(gameName);
  if (!bggId) return null;
  return getGameDetails(bggId);
}

module.exports = { lookupBGG, getGameDetails };
