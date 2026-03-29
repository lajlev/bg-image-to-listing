const xml2js = require("xml2js");

// --- Contents from bgg.js ---
async function searchBGG(gameName) {
  const url = `https://api.geekdo.com/xmlapi2/search?query=${encodeURIComponent(
    gameName,
  )}&type=boardgame&exact=1`;
  const res = await fetch(url);
  const xml = await res.text();
  console.log(`[DEBUG] BGG XML Response (Exact) for ${gameName}:`, xml);
  const parsed = await xml2js.parseStringPromise(xml);
  console.log(
    `[DEBUG] BGG Parsed XML (Exact) for ${gameName}:`,
    JSON.stringify(parsed, null, 2),
  );

  const items = parsed?.items?.item;
  if (!items || items.length === 0) {
    // Retry without exact match
    const url2 = `https://api.geekdo.com/xmlapi2/search?query=${encodeURIComponent(
      gameName,
    )}&type=boardgame`;
    const res2 = await fetch(url2);
    const xml2Text = await res2.text();
    console.log(
      `[DEBUG] BGG XML Response (Non-Exact) for ${gameName}:`,
      xml2Text,
    );
    const parsed2 = await xml2js.parseStringPromise(xml2Text);
    console.log(
      `[DEBUG] BGG Parsed XML (Non-Exact) for ${gameName}:`,
      JSON.stringify(parsed2, null, 2),
    );
    const items2 = parsed2?.items?.item;
    if (!items2 || items2.length === 0) return null;
    return items2[0].$.id;
  }

  return items[0].$.id;
}

async function getGameDetails(bggId) {
  const url = `https://api.geekdo.com/xmlapi2/thing?id=${bggId}&stats=1`;
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
  try {
    const bggId = await searchBGG(gameName);
    if (!bggId) return null;
    return getGameDetails(bggId);
  } catch (err) {
    console.error(`Error in lookupBGG for ${gameName}:`, err);
    return null;
  }
}

// --- Contents from price.js ---
async function lookupPrice(gameName) {
  try {
    const searchUrl = `https://braetspilspriser.dk/item/search?search=${encodeURIComponent(
      gameName,
    )}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BoardGameLister/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    const html = await res.text();
    console.log(
      `[DEBUG] Price HTML Response for ${gameName}:`,
      html.substring(0, 500),
    );

    const pricePatterns = [
      /kr\.?\s*(?:&nbsp;)?(\d{1,5}(?:[.,]\d{2})?)/gi,
      /(\d{1,5}(?:[.,]\d{2})?)\s*kr/gi,
      /DKK\s*(\d{1,5}(?:[.,]\d{2})?)/gi,
      /class="price[^"]*"[^>]*>[\s\S]*?(\d{1,5}(?:[.,]\d{2})?)/gi,
    ];

    const prices = [];
    for (const pattern of pricePatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const price = parseFloat(match[1].replace(",", "."));
        if (price > 10 && price < 10000) {
          prices.push(price);
        }
      }
    }

    console.log(`[DEBUG] Extracted prices for ${gameName}:`, prices);

    if (prices.length > 0) {
      const lowest = Math.min(...prices);
      return `${lowest.toFixed(0)} DKK`;
    }

    return null;
  } catch (e) {
    console.error(`Error looking up price for ${gameName}:`, e);
    return null;
  }
}

// --- Test Execution ---
async function runTests() {
  const gameNames = ["PLANET UNKNOWN", "Big Top", "FLIP 7"];

  for (const gameName of gameNames) {
    console.log(`\n--- Testing ${gameName} ---`);
    const bggData = await lookupBGG(gameName);
    const priceData = await lookupPrice(gameName);

    console.log(`BGG Data for ${gameName}:`, bggData);
    console.log(`Price Data for ${gameName}:`, priceData);
    console.log(`--- Finished ${gameName} ---\n`);
  }
}

runTests();
