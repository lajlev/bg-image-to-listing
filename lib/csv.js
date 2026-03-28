function escapeCSV(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function buildCSV(rows) {
  const headers = ["filename", "game_name", "bgg_link", "price_dkk", "description", "category"];
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(headers.map((h) => escapeCSV(row[h])).join(","));
  }

  return lines.join("\n") + "\n";
}

module.exports = { buildCSV };
