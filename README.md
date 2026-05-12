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

### Health

- `GET /health` — health check

### Movies

- `POST /movies` — create a movie (`title` required; optional `releaseYear`, `genres`)
- `GET /movies` — list movies with average rating; supports query params:
  - `search` — case-insensitive title search
  - `genre` — filter by genre
  - `year` — filter by release year
  - `page` (default `1`) and `limit` (default `20`, max `100`) for pagination
- `GET /movies/:movieId` — get a single movie with average rating
- `PUT /movies/:movieId` — update a movie's `title`, `releaseYear`, and/or `genres`
- `DELETE /movies/:movieId` — delete a movie and all its reviews

### Reviews

- `POST /movies/:movieId/reviews` — add a review (`reviewer` and `rating` 1-5 required; optional `comment`)
- `GET /movies/:movieId/reviews` — list reviews for a movie; supports `page` and `limit` query params
- `DELETE /movies/:movieId/reviews/:reviewId` — delete a specific review
