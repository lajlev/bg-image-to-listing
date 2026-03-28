const xml2js = require("xml2js");

async function searchBGG(gameName) {
  const url = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(gameName)}&type=boardgame&exact=1`;
  const res = await fetch(url);
  const xml = await res.text();
  const parsed = await xml2js.parseStringPromise(xml);

  const items = parsed?.items?.item;
  if (!items || items.length === 0) {
    // Retry without exact match
    const url2 = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(gameName)}&type=boardgame`;
    const res2 = await fetch(url2);
    const xml2Text = await res2.text();
    const parsed2 = await xml2js.parseStringPromise(xml2Text);
    const items2 = parsed2?.items?.item;
    if (!items2 || items2.length === 0) return null;
    return items2[0].$.id;
  }

  return items[0].$.id;
}

async function getGameDetails(bggId) {
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`;
  const res = await fetch(url);
  const xml = await res.text();
  const parsed = await xml2js.parseStringPromise(xml);

  const item = parsed?.items?.item?.[0];
  if (!item) return null;

  const description = (item.description?.[0] || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&#10;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Truncate to ~2 sentences
  const shortDesc = description.split(/\.\s+/).slice(0, 2).join(". ").trim();
  const finalDesc = shortDesc.endsWith(".") ? shortDesc : shortDesc + ".";

  const categories = (item.link || [])
    .filter((l) => l.$.type === "boardgamecategory")
    .map((l) => l.$.value);

  return {
    link: `https://boardgamegeek.com/boardgame/${bggId}`,
    description: finalDesc,
    category: categories.join(", ") || "",
  };
}

async function lookupBGG(gameName) {
  const bggId = await searchBGG(gameName);
  if (!bggId) return null;
  return getGameDetails(bggId);
}

module.exports = { lookupBGG };
