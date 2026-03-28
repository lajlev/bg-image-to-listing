const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

async function identifyGame(imageBuffer, mimeType) {
  const base64 = imageBuffer.toString("base64");
  const mediaType = mimeType || "image/jpeg";

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: "This is a photo of a board game box. Identify the board game. Reply with ONLY the exact game name, nothing else. If you cannot identify it, reply with exactly: Unknown",
          },
        ],
      },
    ],
  });

  const name = response.content[0].text.trim();
  return name === "Unknown" ? null : name;
}

module.exports = { identifyGame };
