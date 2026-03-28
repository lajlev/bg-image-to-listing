async function lookupPrice(gameName) {
  try {
    const searchUrl = `https://braetspilspriser.dk/find/${encodeURIComponent(gameName)}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BoardGameLister/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    const html = await res.text();

    // Look for price patterns in the HTML - Danish prices use comma as decimal separator
    // Common patterns: "123,00 kr", "DKK 123", "123 DKK", "123,00"
    const pricePatterns = [
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

    if (prices.length > 0) {
      const lowest = Math.min(...prices);
      return `${lowest.toFixed(0)} DKK`;
    }

    return null;
  } catch {
    return null;
  }
}

module.exports = { lookupPrice };
