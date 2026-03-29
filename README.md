# bg-image-to-listing

Web app that identifies board games from uploaded images using AI, then displays results in a live table with game name, BGG link, price from braetspilspriser.dk, year published, certainty score, description, and category — with CSV export.

## Overview

Upload one or more photos of board game boxes. The app uses AI vision to identify each game, enriches it with data from BoardGameGeek and braetspilspriser.dk, and streams results into a live table as each image is processed. Export the final results as a CSV file.

## Features

- Upload multiple images at once (drag & drop or file picker)
- Client-side image resizing (max 1024px) before upload
- AI-powered board game identification from box art
- Certainty score (1-10) for each identification
- Automatic data enrichment from BoardGameGeek and braetspilspriser.dk
- Live results table — rows appear as each image is processed
- CSV export with all results
- Rate-limited API requests to avoid throttling
- Deployable to Google Cloud Run

## CSV Output Format

| Column | Description |
|---|---|
| `filename` | Original uploaded image filename |
| `game_name` | Identified board game title |
| `year_published` | Year the game was published (from BGG) |
| `certainty` | AI confidence score (1-10) based on image vs BGG description |
| `bgg_link` | Direct URL to the game on BoardGameGeek |
| `price_dkk` | Current price from braetspilspriser.dk (DKK, incl. shipping) |
| `price_link` | Direct URL to the game on braetspilspriser.dk |
| `description` | Short description of the game (1-2 sentences) |
| `category` | Game type/category (e.g. Strategy, Family, Party) |

## Tech Stack

- **Frontend**: Single-page vanilla HTML/CSS/JS app
- **Backend**: Node.js + Express API
- **AI Vision**: OpenAI GPT-4o for game identification and certainty scoring
- **Data sources**:
  - [BoardGameGeek XML API 2](https://api.geekdo.com/xmlapi2/) (via api.geekdo.com) — game metadata, description, category, year
  - [braetspilspriser.dk](https://braetspilspriser.dk) — Danish board game price comparison
- **Streaming**: NDJSON response for real-time progress
- **Hosting**: Google Cloud Run

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [OpenAI API key](https://platform.openai.com/api-keys)
- [BGG API token](https://boardgamegeek.com/wiki/page/BGG_XML_API2)

### 1. Clone and Install

```sh
git clone https://github.com/lajlev/bg-image-to-listing.git
cd bg-image-to-listing
npm install --prefix backend
npm install --prefix frontend
```

### 2. Configure Environment

```sh
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```
OPENAI_API_KEY=sk-your-openai-key
BGG_API_TOKEN=your-bgg-api-token
```

### 3. Run Locally

Start backend and frontend in two terminals:

```sh
# Terminal 1: Backend API (port 3001)
npm run start --prefix backend

# Terminal 2: Frontend (port 3000)
npm run start --prefix frontend
```

Open http://localhost:3000.

## Deployment (Google Cloud Run)

```sh
# Authenticate and set project
gcloud auth login
gcloud config set project lillefar-com

# Deploy (reads secrets from backend/.env automatically)
./deploy.sh
```

The deploy script builds a Docker container and deploys to Cloud Run in `europe-west1`.

## Architecture

```
[User] --uploads images--> [Frontend (static HTML)]
  --resizes to 1024px-->
  --> POST /api/identify (multipart/form-data)
    --> GPT-4o Vision: identify game name
    --> BGG API: fetch metadata (description, category, year)
    --> GPT-4o: certainty score (image vs BGG description)
    --> braetspilspriser.dk: scrape current price
  --> Stream NDJSON (one JSON line per image)
[Frontend] --displays--> results table (live updates)
[User] --clicks Export CSV--> downloads brettspill-listing.csv
```

## API

### `POST /api/identify`

**Request**: `multipart/form-data` with image files (field: `images`, max 50)

**Response**: `application/x-ndjson` — one JSON object per line, streamed as each image completes

**Rate limiting**: 2s delay between BGG/price lookups to avoid throttling

## Error Handling

- Image not recognized: row included with `game_name = "Unknown"`, other fields empty
- BGG lookup fails: `bgg_link`, `description`, `year_published` left blank
- Price not found: `price_dkk = "N/A"`
- All errors are non-fatal — partial results always returned

## Future Ideas

- [ ] Manual override of game name before CSV export
- [ ] Support for MobilePay / Marketplace export formats
- [ ] Cache BGG lookups to avoid rate limiting
- [ ] Option to export as JSON instead of CSV
