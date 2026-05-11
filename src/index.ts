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

app.get("/movies", dbRateLimiter, async (_req, res) => {
  try {
    const movies = await MovieModel.find().lean();

    const ratings = await ReviewModel.aggregate<{ _id: mongoose.Types.ObjectId; averageRating: number }>([
      { $group: { _id: "$movieId", averageRating: { $avg: "$rating" } } },
    ]);

    const ratingMap = new Map(ratings.map((rating) => [rating._id.toString(), Number(rating.averageRating.toFixed(1))]));

    return res.status(200).json(
      movies.map((movie) => ({
        ...movie,
        averageRating: ratingMap.get(movie._id.toString()) ?? null,
      })),
    );
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

  try {
    const reviews = await ReviewModel.find({ movieId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json(reviews);
  } catch (error) {
    console.error("Failed to fetch reviews", error);
    return res.status(500).json({ message: "Failed to fetch reviews" });
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
