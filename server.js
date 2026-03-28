const express = require("express");
const multer = require("multer");
const path = require("path");
const { identifyGame } = require("./lib/vision");
const { lookupBGG } = require("./lib/bgg");
const { lookupPrice } = require("./lib/price");
const { buildCSV } = require("./lib/csv");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/identify", upload.array("images", 50), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No images uploaded" });
  }

  const results = [];

  for (const file of req.files) {
    const row = { filename: file.originalname, game_name: "Unknown", bgg_link: "", price_dkk: "N/A", description: "", category: "" };

    try {
      const gameName = await identifyGame(file.buffer, file.mimetype);
      if (gameName) {
        row.game_name = gameName;

        const [bggData, priceData] = await Promise.all([
          lookupBGG(gameName).catch(() => null),
          lookupPrice(gameName).catch(() => null),
        ]);

        if (bggData) {
          row.bgg_link = bggData.link || "";
          row.description = bggData.description || "";
          row.category = bggData.category || "";
        }
        if (priceData) {
          row.price_dkk = priceData;
        }
      }
    } catch (err) {
      console.error(`Error processing ${file.originalname}:`, err.message);
    }

    results.push(row);
  }

  const csv = buildCSV(results);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="brettspill-listing.csv"');
  res.send(csv);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
