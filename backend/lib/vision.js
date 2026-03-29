const OpenAI = require("openai");

let client;
function getClient() {
  if (!client) client = new OpenAI();
  return client;
}

async function identifyGame(imageBuffer, mimeType) {
  const base64 = imageBuffer.toString("base64");
  const mediaType = mimeType || "image/jpeg";

  const response = await getClient().chat.completions.create({
    model: "gpt-4o",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mediaType};base64,${base64}` },
          },
          {
            type: "text",
            text: "This is a photo of a board game box. Identify the board game. Reply with ONLY the exact game name, nothing else. If you cannot identify it, reply with exactly: Unknown",
          },
        ],
      },
    ],
  });

  const name = response.choices[0].message.content.trim();
  return name === "Unknown" ? null : name;
}

async function confirmMatch(imageBuffer, mimeType, gameName, bggDescription) {
  const base64 = imageBuffer.toString("base64");
  const mediaType = mimeType || "image/jpeg";

  const response = await getClient().chat.completions.create({
    model: "gpt-4o",
    max_tokens: 10,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mediaType};base64,${base64}` },
          },
          {
            type: "text",
            text: `I identified this board game box as "${gameName}". The BGG description is: "${bggDescription}". How certain are you that this identification is correct? Reply with ONLY a number from 1 to 10, where 10 is absolutely certain and 1 is very unlikely. Nothing else.`,
          },
        ],
      },
    ],
  });

  const score = parseInt(response.choices[0].message.content.trim(), 10);
  return isNaN(score) ? null : Math.min(10, Math.max(1, score));
}

module.exports = { identifyGame, confirmMatch };
