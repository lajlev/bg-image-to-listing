async function lookupPrice(gameName) {
  try {
    const searchUrl = `https://braetspilspriser.dk/item/search?search=${encodeURIComponent(gameName)}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BoardGameLister/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    const html = await res.text();

    // Extract only prices from <span class="price"> tags
    const pricePattern = /<span class="price">kr\.&nbsp;(\d{1,5}(?:[.,]\d{2})?)<\/span>/gi;
    const prices = [];
    let match;
    while ((match = pricePattern.exec(html)) !== null) {
      const price = parseFloat(match[1].replace(",", "."));
      if (price > 10 && price < 10000) {
        prices.push(price);
      }
    }

    console.log("[DEBUG] Extracted prices:", prices);

    // First price is the best "med fragt" price for the top search result
    if (prices.length > 0) {
      const bestPrice = prices[0];
      const linkMatch = html.match(/href="(\/item\/show\/[^"]+)"/);
      const link = linkMatch
        ? `https://braetspilspriser.dk${linkMatch[1]}`
        : searchUrl;
      return { price: `${bestPrice.toFixed(0)} DKK`, link };
    }

    return null;
  } catch {
    return null;
  }
}

module.exports = { lookupPrice };
