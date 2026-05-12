# ae-capstone

Minimal backend scaffold for a movie review and tracking app using Node.js, TypeScript, and MongoDB.

## Requirements

- Node.js 20+
- MongoDB (local or remote)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Update `MONGODB_URI` in `.env` if needed.
4. Build and run:
   ```bash
   npm run build
   npm start
   ```

## API

- `GET /health` — health check
- `POST /movies` — create a movie
- `GET /movies` — list movies with average rating
- `POST /movies/:movieId/reviews` — add a review (rating 1-5)
- `GET /movies/:movieId/reviews` — list reviews for a movie
