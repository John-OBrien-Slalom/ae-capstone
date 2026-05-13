# ae-capstone

Movie review and tracking app with a full web frontend, built with Node.js, TypeScript, and in-memory storage.

## Requirements

- Node.js 20+

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Build and run:
   ```bash
   npm run build
   npm start
   ```
4. Open your browser at `http://localhost:3000`

## Frontend

The app ships a browser-based single-page frontend served directly from the Express server at `/`. Features include:

- **Movies tab** — search movies, filter to only show rated movies, add a new movie, view reviews, delete a movie
- **Reviews** (inside movie detail) — add a rating (1–5 stars) with an optional comment, edit an existing rating, delete a rating
- **Watchlist tab** — maintain a list of movies you want to see (with optional notes), remove items, and have those titles also appear in the Movies tab

## API

### Health

- `GET /health` — health check

### Movies

- `POST /movies` — create a movie (`title` required; optional `releaseYear`, `genres`)
- `GET /movies` — list movies with average rating; supports query params:
  - `search` — case-insensitive title search
  - `genre` — filter by genre
  - `year` — filter by release year
  - `rated=true` — only return movies that have at least one review
  - `page` (default `1`) and `limit` (default `20`, max `100`) for pagination
- `GET /movies/:movieId` — get a single movie with average rating
- `PUT /movies/:movieId` — update a movie's `title`, `releaseYear`, and/or `genres`
- `DELETE /movies/:movieId` — delete a movie and all its reviews

### Reviews

- `POST /movies/:movieId/reviews` — add a review (`reviewer` and `rating` 1-5 required; optional `comment`)
- `GET /movies/:movieId/reviews` — list reviews for a movie; supports `page` and `limit` query params
- `PUT /movies/:movieId/reviews/:reviewId` — update a review's `rating` and/or `comment`
- `DELETE /movies/:movieId/reviews/:reviewId` — delete a specific review

### Watchlist

- `GET /watchlist` — list all watchlist items
- `POST /watchlist` — add an item (`title` required; optional `note`); the title is also added to the movie list if it is not already there
- `DELETE /watchlist/:itemId` — remove a watchlist item
