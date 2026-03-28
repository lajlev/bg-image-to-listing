# bg-image-to-listing

Web app that identifies board games from uploaded images using AI, then returns a CSV with game name, BGG link, price from brætspilspriser.dk, short description, and category.

## Overview

Upload one or more photos of board game boxes. The app uses AI vision to identify each game, enriches it with data from BoardGameGeek and brætspilspriser.dk, and returns a downloadable CSV file — ready to use for cataloguing, selling, or sharing your collection.

## Features

- Upload multiple images at once (drag & drop or file picker)
- AI-powered board game identification from box art
- Automatic data enrichment from external sources
- CSV download with all results
- Simple, single-page UI — no account required

## CSV Output Format

| Column | Description |
|---|---|
| `filename` | Original uploaded image filename |
| `game_name` | Identified board game title |
| `bgg_link` | Direct URL to the game on BoardGameGeek |
| `price_dkk` | Current price from brætspilspriser.dk (DKK) |
| `description` | Short description of the game (1-2 sentences) |
| `category` | Game type/category (e.g. Strategy, Family, Party, Cooperative) |

## Tech Stack

- **Frontend**: Single-page app (React or plain HTML/JS)
- **Backend**: Node.js API (or serverless functions)
- **AI Vision**: OpenAI GPT-4o Vision (or Claude claude-opus-4-5) for game identification
- **Data sources**:
  - [BoardGameGeek XML API 2](https://boardgamegeek.com/wiki/page/BGG_XML_API2) — game metadata, description, category
  - [brætspilspriser.dk](https://braetspilspriser.dk) — Danish price comparison (scraped or via API if available)
- **Export**: Server-side CSV generation

## Architecture

```
[User] --uploads images--> [Frontend]
  --> POST /api/identify (multipart/form-data)
    --> AI Vision: identify game name per image
    --> BGG API: fetch game id, description, category, bgg link
    --> brætspilspriser.dk: fetch current lowest price
  --> Return CSV file
[User] --downloads--> results.csv
```

## API Endpoints

### `POST /api/identify`

**Request**: `multipart/form-data` with one or more image files

**Response**: `text/csv` file download

**Processing per image**:
1. Send image to AI vision model → get game name
2. Search BGG API for game → get BGG ID, link, description, categories
3. Search brætspilspriser.dk for game → get lowest current price in DKK
4. Combine into CSV row

## UI Flow

1. User lands on page — sees upload area
2. User drops or selects 1–N images
3. Thumbnails shown with status indicators (pending / processing / done / error)
4. "Generate CSV" button triggers processing
5. Progress shown per image
6. When all done: "Download CSV" button appears
7. CSV downloaded as `brettspill-listing.csv`

## Error Handling

- Image not recognized: row included with `game_name = "Unknown"`, other fields empty
- BGG lookup fails: `bgg_link` and `description` left blank, note in CSV
- Price not found: `price_dkk = "N/A"`
- All errors are non-fatal — partial results always returned

## Future Ideas

- [ ] Confidence score per identification
- [ ] Manual override of game name before CSV export
- [ ] Support for MobilePay / Marketplace export formats
- [ ] Cache BGG lookups to avoid rate limiting
- [ ] Option to export as JSON instead of CSV
