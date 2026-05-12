import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import mongoose, { isValidObjectId } from "mongoose";

import { MovieModel } from "./models/Movie";
import { ReviewModel } from "./models/Review";

const app = express();
app.use(express.json());

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

    const movie = await MovieModel.create({
      title,
      releaseYear,
      genres: Array.isArray(genres) ? genres : [],
    });

    return res.status(201).json(movie);
  } catch (error) {
    console.error("Failed to create movie", error);
    return res.status(500).json({ message: "Failed to create movie" });
  }
});

app.get("/movies", dbRateLimiter, async (req, res) => {
  try {
    const { search, genre, year } = req.query;
    const page = Math.max(1, Number(req.query["page"] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query["limit"] ?? 20)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (typeof search === "string" && search.trim() !== "") {
      filter["title"] = { $regex: search.trim(), $options: "i" };
    }
    if (typeof genre === "string" && genre.trim() !== "") {
      filter["genres"] = genre.trim();
    }
    if (year !== undefined && !isNaN(Number(year))) {
      filter["releaseYear"] = Number(year);
    }

    const [movies, total] = await Promise.all([
      MovieModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MovieModel.countDocuments(filter),
    ]);

    const movieIds = movies.map((m) => m._id);

    const ratings = await ReviewModel.aggregate<{ _id: mongoose.Types.ObjectId; averageRating: number }>([
      { $match: { movieId: { $in: movieIds } } },
      { $group: { _id: "$movieId", averageRating: { $avg: "$rating" } } },
    ]);

    const ratingMap = new Map(ratings.map((rating) => [rating._id.toString(), Number(rating.averageRating.toFixed(1))]));

    return res.status(200).json({
      data: movies.map((movie) => ({
        ...movie,
        averageRating: ratingMap.get(movie._id.toString()) ?? null,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Failed to fetch movies", error);
    return res.status(500).json({ message: "Failed to fetch movies" });
  }
});

app.post("/movies/:movieId/reviews", dbRateLimiter, async (req, res) => {
  const { movieId } = req.params;
  const { reviewer, rating, comment } = req.body;

  if (typeof movieId !== "string" || !isValidObjectId(movieId)) {
    return res.status(400).json({ message: "invalid movieId" });
  }

  if (!reviewer || typeof reviewer !== "string") {
    return res.status(400).json({ message: "reviewer is required" });
  }

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "rating must be a number between 1 and 5" });
  }

  try {
    const movie = await MovieModel.findById(movieId).lean();

    if (!movie) {
      return res.status(404).json({ message: "movie not found" });
    }

    const review = await ReviewModel.create({ movieId, reviewer, rating, comment });

    return res.status(201).json(review);
  } catch (error) {
    console.error("Failed to create review", error);
    return res.status(500).json({ message: "Failed to create review" });
  }
});

app.get("/movies/:movieId/reviews", dbRateLimiter, async (req, res) => {
  const { movieId } = req.params;

  if (typeof movieId !== "string" || !isValidObjectId(movieId)) {
    return res.status(400).json({ message: "invalid movieId" });
  }

  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query["limit"] ?? 20)));
  const skip = (page - 1) * limit;

  try {
    const [reviews, total] = await Promise.all([
      ReviewModel.find({ movieId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ReviewModel.countDocuments({ movieId }),
    ]);
    return res.status(200).json({ data: reviews, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Failed to fetch reviews", error);
    return res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

app.delete("/movies/:movieId/reviews/:reviewId", dbRateLimiter, async (req, res) => {
  const { movieId, reviewId } = req.params;

  if (typeof movieId !== "string" || !isValidObjectId(movieId)) {
    return res.status(400).json({ message: "invalid movieId" });
  }

  if (typeof reviewId !== "string" || !isValidObjectId(reviewId)) {
    return res.status(400).json({ message: "invalid reviewId" });
  }

  try {
    const review = await ReviewModel.findOneAndDelete({ _id: reviewId, movieId }).lean();

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

  if (typeof movieId !== "string" || !isValidObjectId(movieId)) {
    return res.status(400).json({ message: "invalid movieId" });
  }

  try {
    const movie = await MovieModel.findById(movieId).lean();

    if (!movie) {
      return res.status(404).json({ message: "movie not found" });
    }

    const ratingResult = await ReviewModel.aggregate<{ averageRating: number }>([
      { $match: { movieId: movie._id } },
      { $group: { _id: null, averageRating: { $avg: "$rating" } } },
    ]);

    const averageRating = ratingResult.length > 0 ? Number(ratingResult[0].averageRating.toFixed(1)) : null;

    return res.status(200).json({ ...movie, averageRating });
  } catch (error) {
    console.error("Failed to fetch movie", error);
    return res.status(500).json({ message: "Failed to fetch movie" });
  }
});

app.put("/movies/:movieId", dbRateLimiter, async (req, res) => {
  const { movieId } = req.params;

  if (typeof movieId !== "string" || !isValidObjectId(movieId)) {
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

  const update: Record<string, unknown> = {};
  if (title !== undefined) update["title"] = title;
  if (releaseYear !== undefined) update["releaseYear"] = releaseYear;
  if (genres !== undefined) update["genres"] = genres;

  try {
    const movie = await MovieModel.findByIdAndUpdate(movieId, { $set: update }, { new: true, runValidators: true }).lean();

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

  if (typeof movieId !== "string" || !isValidObjectId(movieId)) {
    return res.status(400).json({ message: "invalid movieId" });
  }

  try {
    const movie = await MovieModel.findByIdAndDelete(movieId).lean();

    if (!movie) {
      return res.status(404).json({ message: "movie not found" });
    }

    await ReviewModel.deleteMany({ movieId });

    return res.status(200).json({ message: "movie deleted" });
  } catch (error) {
    console.error("Failed to delete movie", error);
    return res.status(500).json({ message: "Failed to delete movie" });
  }
});

const mongoUri = process.env.MONGODB_URI;
const port = Number(process.env.PORT ?? 3000);

if (!mongoUri) {
  throw new Error("MONGODB_URI must be set");
}

const start = async () => {
  try {
    await mongoose.connect(mongoUri);
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  }
};

void start();
