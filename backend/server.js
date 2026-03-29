require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { identifyGame, confirmMatch } = require("./lib/vision");
const { lookupBGG, getGameDetails } = require("./lib/bgg");
const { lookupPrice } = require("./lib/price");
const { buildCSV } = require("./lib/csv");

const app = express();
app.use(cors());
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Auth
const tokens = new Set();

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.AUTH_USER &&
    password === process.env.AUTH_PASS
  ) {
    const token = crypto.randomBytes(32).toString("hex");
    tokens.add(token);
    return res.json({ token });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !tokens.has(auth.replace("Bearer ", ""))) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

const RATE_LIMIT_MS = 2000;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

app.post("/api/identify", requireAuth, upload.array("images", 50), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No images uploaded" });
  }

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    const row = {
      index: i,
      filename: file.originalname,
      game_name: "Unknown",
      year_published: "",
      certainty: "",
      bgg_link: "",
      bgg_thumbnail: "",
      price_dkk: "N/A",
      price_link: "",
      description: "",
      category: "",
    };

    try {
      const gameName = await identifyGame(file.buffer, file.mimetype);
      console.log(`[DEBUG] Identified game: ${gameName}`);
      if (gameName) {
        row.game_name = gameName;

        const bggData = await lookupBGG(gameName).catch(() => null);
        console.log(`[DEBUG] BGG data for ${gameName}:`, bggData);
        if (bggData) {
          row.bgg_link = bggData.link || "";
          row.bgg_thumbnail = bggData.thumbnail || "";
          row.description = bggData.description || "";
          row.category = bggData.category || "";
          row.year_published = bggData.year_published || "";

          const score = await confirmMatch(file.buffer, file.mimetype, gameName, bggData.description).catch(() => null);
          if (score) row.certainty = score;
        }

        await delay(RATE_LIMIT_MS);

        const priceData = await lookupPrice(gameName).catch(() => null);
        console.log(`[DEBUG] Price data for ${gameName}:`, priceData);
        if (priceData) {
          row.price_dkk = priceData.price;
          row.price_link = priceData.link;
        }
      }
    } catch (err) {
      console.error(`Error processing ${file.originalname}:`, err.message);
    }

    res.write(JSON.stringify(row) + "\n");

    if (i < req.files.length - 1) {
      await delay(RATE_LIMIT_MS);
    }
  }

  res.end();
});

app.post("/api/lookup-bgg", requireAuth, async (req, res) => {
  const { bgg_link } = req.body;
  if (!bgg_link) return res.status(400).json({ error: "bgg_link required" });

  const match = bgg_link.match(/boardgame\/(\d+)/);
  if (!match) return res.status(400).json({ error: "Invalid BGG URL" });

  const bggId = match[1];
  try {
    const bggData = await getGameDetails(bggId);
    if (!bggData) return res.status(404).json({ error: "Game not found" });

    await delay(RATE_LIMIT_MS);

    const priceData = await lookupPrice(bggData.name).catch(() => null);

    res.json({
      game_name: bggData.name,
      bgg_link: bggData.link,
      bgg_thumbnail: bggData.thumbnail || "",
      description: bggData.description,
      category: bggData.category,
      year_published: bggData.year_published,
      price_dkk: priceData ? priceData.price : "N/A",
      price_link: priceData ? priceData.link : "",
    });
  } catch (err) {
    console.error("Error in lookup-bgg:", err.message);
    res.status(500).json({ error: "Lookup failed" });
  }
});

const OpenAI = require("openai");

app.post("/api/sales-text", requireAuth, async (req, res) => {
  const { game_name, year_published, description, category, bgg_link, price_dkk, price_link } = req.body;
  if (!game_name) return res.status(400).json({ error: "game_name required" });

  try {
    const client = new OpenAI();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          text: undefined,
          content: `Write a short Danish sales post for a board game. Use this format exactly:

${game_name} (${year_published || "?"})
[Short ~40 word description in Danish based on the English description below]
[Translate these categories to Danish: ${category || "N/A"}]
Læs mere: ${bgg_link || "N/A"}

Nypris: ${price_dkk || "N/A"}
Baseret på: ${price_link || "N/A"}

English description to translate and summarize:
${description || "No description available."}

Important: Write ONLY the sales post text, nothing else. Keep the description engaging and around 40 words in Danish.`,
        },
      ],
    });

    const text = response.choices[0].message.content.trim();
    res.json({ text });
  } catch (err) {
    console.error("Error generating sales text:", err.message);
    res.status(500).json({ error: "Failed to generate sales text" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
