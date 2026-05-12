import { Schema, model, type InferSchemaType } from "mongoose";

const reviewSchema = new Schema(
  {
    movieId: { type: Schema.Types.ObjectId, ref: "Movie", required: true, index: true },
    reviewer: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
  },
  { timestamps: true },
);

export type Review = InferSchemaType<typeof reviewSchema>;

export const ReviewModel = model("Review", reviewSchema);
