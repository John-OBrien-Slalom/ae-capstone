import "dotenv/config";
import path from "path";
import express from "express";
import rateLimit from "express-rate-limit";
import {
  createMovie,
  createReview,
  createWatchlistItem,
  deleteMovie,
  deleteReview,
  deleteWatchlistItem,
  getMovie,
  getMovieWithAverageRating,
  isValidId,
  listMovies,
  listReviews,
  listWatchlistItems,
  updateMovie,
  updateReview,
} from "./storage/inMemory";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const dbRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests" },
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/movies", dbRateLimiter, async (req, res) => {
  try {
    const { title, releaseYear, genres } = req.body;

    if (!title || typeof title !== "string") {
      return res.status(400).json({ message: "title is required" });
    }

    const movie = createMovie({
      title,
      releaseYear,
      genres,
    });

    return res.status(201).json(movie);
  } catch (error) {
    console.error("Failed to create movie", error);
    return res.status(500).json({ message: "Failed to create movie" });
  }
});

app.get("/movies", dbRateLimiter, async (req, res) => {
  try {
    const { search, genre, year, rated } = req.query;
    const page = Math.max(1, Number(req.query["page"] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query["limit"] ?? 20)));
    const { data, total, totalPages } = listMovies({
      search: typeof search === "string" ? search : undefined,
      genre: typeof genre === "string" ? genre : undefined,
      year: year !== undefined && !isNaN(Number(year)) ? Number(year) : undefined,
      ratedOnly: rated === "true",
      page,
      limit,
    });

    return res.status(200).json({
      data,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    console.error("Failed to fetch movies", error);
    return res.status(500).json({ message: "Failed to fetch movies" });
  }
});

app.post("/movies/:movieId/reviews", dbRateLimiter, async (req, res) => {
  const { movieId } = req.params;
  const { reviewer, rating, comment } = req.body;

  if (typeof movieId !== "string" || !isValidId(movieId)) {
    return res.status(400).json({ message: "invalid movieId" });
  }

  if (!reviewer || typeof reviewer !== "string") {
    return res.status(400).json({ message: "reviewer is required" });
  }

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "rating must be a number between 1 and 5" });
  }

  try {
    const movie = getMovie(movieId);

    if (!movie) {
      return res.status(404).json({ message: "movie not found" });
    }

    const review = createReview({ movieId, reviewer, rating, comment });

    return res.status(201).json(review);
  } catch (error) {
    console.error("Failed to create review", error);
    return res.status(500).json({ message: "Failed to create review" });
  }
});

app.get("/movies/:movieId/reviews", dbRateLimiter, async (req, res) => {
  const { movieId } = req.params;

  if (typeof movieId !== "string" || !isValidId(movieId)) {
    return res.status(400).json({ message: "invalid movieId" });
  }

  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query["limit"] ?? 20)));

  try {
    const { data, total, totalPages } = listReviews(movieId, page, limit);
    return res.status(200).json({ data, page, limit, total, totalPages });
  } catch (error) {
    console.error("Failed to fetch reviews", error);
    return res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

app.put("/movies/:movieId/reviews/:reviewId", dbRateLimiter, async (req, res) => {
  const { movieId, reviewId } = req.params;

  if (typeof movieId !== "string" || !isValidId(movieId)) {
    return res.status(400).json({ message: "invalid movieId" });
  }

  if (typeof reviewId !== "string" || !isValidId(reviewId)) {
    return res.status(400).json({ message: "invalid reviewId" });
  }

  const { rating, comment } = req.body;

  if (rating !== undefined && (typeof rating !== "number" || rating < 1 || rating > 5)) {
    return res.status(400).json({ message: "rating must be a number between 1 and 5" });
  }

  if (rating === undefined && comment === undefined) {
    return res.status(400).json({ message: "nothing to update" });
  }

  try {
    const review = updateReview(movieId, reviewId, { rating, comment });

    if (!review) {
      return res.status(404).json({ message: "review not found" });
    }

    return res.status(200).json(review);
  } catch (error) {
    console.error("Failed to update review", error);
    return res.status(500).json({ message: "Failed to update review" });
  }
});

app.delete("/movies/:movieId/reviews/:reviewId", dbRateLimiter, async (req, res) => {
  const { movieId, reviewId } = req.params;

  if (typeof movieId !== "string" || !isValidId(movieId)) {
    return res.status(400).json({ message: "invalid movieId" });
  }

  if (typeof reviewId !== "string" || !isValidId(reviewId)) {
    return res.status(400).json({ message: "invalid reviewId" });
  }

  try {
    const review = deleteReview(movieId, reviewId);

    if (!review) {
      return res.status(404).json({ message: "review not found" });
    }

    return res.status(200).json({ message: "review deleted" });
  } catch (error) {
    console.error("Failed to delete review", error);
    return res.status(500).json({ message: "Failed to delete review" });
  }
});

app.get("/movies/:movieId", dbRateLimiter, async (req, res) => {
  const { movieId } = req.params;

  if (typeof movieId !== "string" || !isValidId(movieId)) {
    return res.status(400).json({ message: "invalid movieId" });
  }

  try {
    const movie = getMovieWithAverageRating(movieId);

    if (!movie) {
      return res.status(404).json({ message: "movie not found" });
    }
    return res.status(200).json(movie);
  } catch (error) {
    console.error("Failed to fetch movie", error);
    return res.status(500).json({ message: "Failed to fetch movie" });
  }
});

app.put("/movies/:movieId", dbRateLimiter, async (req, res) => {
  const { movieId } = req.params;

  if (typeof movieId !== "string" || !isValidId(movieId)) {
    return res.status(400).json({ message: "invalid movieId" });
  }

  const { title, releaseYear, genres } = req.body;

  if (title !== undefined && (typeof title !== "string" || title.trim() === "")) {
    return res.status(400).json({ message: "title must be a non-empty string" });
  }

  if (releaseYear !== undefined && (typeof releaseYear !== "number" || releaseYear < 1888)) {
    return res.status(400).json({ message: "releaseYear must be a number no earlier than 1888" });
  }

  if (genres !== undefined && !Array.isArray(genres)) {
    return res.status(400).json({ message: "genres must be an array" });
  }

  try {
    const movie = updateMovie(movieId, { title, releaseYear, genres });

    if (!movie) {
      return res.status(404).json({ message: "movie not found" });
    }

    return res.status(200).json(movie);
  } catch (error) {
    console.error("Failed to update movie", error);
    return res.status(500).json({ message: "Failed to update movie" });
  }
});

app.delete("/movies/:movieId", dbRateLimiter, async (req, res) => {
  const { movieId } = req.params;

  if (typeof movieId !== "string" || !isValidId(movieId)) {
    return res.status(400).json({ message: "invalid movieId" });
  }

  try {
    const movie = deleteMovie(movieId);

    if (!movie) {
      return res.status(404).json({ message: "movie not found" });
    }

    return res.status(200).json({ message: "movie deleted" });
  } catch (error) {
    console.error("Failed to delete movie", error);
    return res.status(500).json({ message: "Failed to delete movie" });
  }
});

app.get("/watchlist", dbRateLimiter, async (_req, res) => {
  try {
    const items = listWatchlistItems();
    return res.status(200).json(items);
  } catch (error) {
    console.error("Failed to fetch watchlist", error);
    return res.status(500).json({ message: "Failed to fetch watchlist" });
  }
});

app.post("/watchlist", dbRateLimiter, async (req, res) => {
  const { title, note } = req.body;

  if (!title || typeof title !== "string") {
    return res.status(400).json({ message: "title is required" });
  }

  try {
    const item = createWatchlistItem({ title, note });
    return res.status(201).json(item);
  } catch (error) {
    console.error("Failed to add to watchlist", error);
    return res.status(500).json({ message: "Failed to add to watchlist" });
  }
});

app.delete("/watchlist/:itemId", dbRateLimiter, async (req, res) => {
  const { itemId } = req.params;

  if (typeof itemId !== "string" || !isValidId(itemId)) {
    return res.status(400).json({ message: "invalid itemId" });
  }

  try {
    const item = deleteWatchlistItem(itemId);

    if (!item) {
      return res.status(404).json({ message: "watchlist item not found" });
    }

    return res.status(200).json({ message: "watchlist item removed" });
  } catch (error) {
    console.error("Failed to remove from watchlist", error);
    return res.status(500).json({ message: "Failed to remove from watchlist" });
  }
});

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
