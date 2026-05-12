import { Schema, model, type InferSchemaType } from "mongoose";

const movieSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    releaseYear: { type: Number, min: 1888 },
    genres: { type: [String], default: [] },
  },
  { timestamps: true },
);

export type Movie = InferSchemaType<typeof movieSchema>;

export const MovieModel = model("Movie", movieSchema);
