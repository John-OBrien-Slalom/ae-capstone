import { Schema, model, type InferSchemaType } from "mongoose";

const watchlistSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
  },
  { timestamps: true },
);

export type WatchlistItem = InferSchemaType<typeof watchlistSchema>;

export const WatchlistModel = model("Watchlist", watchlistSchema);
