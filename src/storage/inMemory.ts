import { randomBytes } from "node:crypto";

type BaseRecord = {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Movie = BaseRecord & {
  title: string;
  releaseYear?: number;
  genres: string[];
};

export type Review = BaseRecord & {
  movieId: string;
  reviewer: string;
  rating: number;
  comment?: string;
};

export type WatchlistItem = BaseRecord & {
  title: string;
  note?: string;
};

const movies: Movie[] = [];
const reviews: Review[] = [];
const watchlistItems: WatchlistItem[] = [];

const idPattern = /^[a-f0-9]{24}$/i;
const ratingPrecisionFactor = 10;

const generateId = () => randomBytes(12).toString("hex");
const roundToOneDecimal = (value: number) => Math.round(value * ratingPrecisionFactor) / ratingPrecisionFactor;

const trimToUndefined = (value: string | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const cloneMovie = (movie: Movie): Movie => ({
  ...movie,
  genres: [...movie.genres],
});

const cloneReview = (review: Review): Review => ({
  ...review,
});

const cloneWatchlistItem = (item: WatchlistItem): WatchlistItem => ({
  ...item,
});

const sortNewestFirst = <T extends BaseRecord>(items: T[]) =>
  [...items].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

const normalizeGenres = (genres: unknown) => {
  if (!Array.isArray(genres)) {
    return [];
  }

  return genres
    .filter((genre): genre is string => typeof genre === "string")
    .map((genre) => genre.trim())
    .filter((genre) => genre !== "");
};

export const isValidId = (value: string) => idPattern.test(value);

export const createMovie = (input: { title: string; releaseYear?: number; genres?: unknown }) => {
  const now = new Date();
  const movie: Movie = {
    _id: generateId(),
    title: input.title.trim(),
    releaseYear: input.releaseYear,
    genres: normalizeGenres(input.genres),
    createdAt: now,
    updatedAt: now,
  };

  movies.push(movie);
  return cloneMovie(movie);
};

export const listMovies = (params: {
  search?: string;
  genre?: string;
  year?: number;
  ratedOnly?: boolean;
  page: number;
  limit: number;
}) => {
  const search = params.search?.trim().toLowerCase();
  const genre = params.genre?.trim();
  const ratedMovieIds = params.ratedOnly ? new Set(reviews.map((review) => review.movieId)) : null;

  const filtered = sortNewestFirst(movies).filter((movie) => {
    if (search && !movie.title.toLowerCase().includes(search)) {
      return false;
    }

    if (genre && !movie.genres.includes(genre)) {
      return false;
    }

    if (params.year !== undefined && movie.releaseYear !== params.year) {
      return false;
    }

    if (ratedMovieIds && !ratedMovieIds.has(movie._id)) {
      return false;
    }

    return true;
  });

  const total = filtered.length;
  const skip = (params.page - 1) * params.limit;
  const averageRatings = getAverageRatingMap(new Set(filtered.map((movie) => movie._id)));
  const data = filtered.slice(skip, skip + params.limit).map((movie) => ({
    ...cloneMovie(movie),
    averageRating: averageRatings.get(movie._id) ?? null,
  }));

  return {
    data,
    total,
    totalPages: Math.ceil(total / params.limit),
  };
};

export const getMovie = (movieId: string) => {
  const movie = movies.find((entry) => entry._id === movieId);
  return movie ? cloneMovie(movie) : null;
};

export const getMovieWithAverageRating = (movieId: string) => {
  const movie = getMovie(movieId);
  if (!movie) {
    return null;
  }

  return {
    ...movie,
    averageRating: getAverageRating(movieId),
  };
};

export const updateMovie = (
  movieId: string,
  update: { title?: string; releaseYear?: number; genres?: unknown },
) => {
  const movie = movies.find((entry) => entry._id === movieId);

  if (!movie) {
    return null;
  }

  if (update.title !== undefined) {
    movie.title = update.title.trim();
  }

  if (update.releaseYear !== undefined) {
    movie.releaseYear = update.releaseYear;
  }

  if (update.genres !== undefined) {
    movie.genres = normalizeGenres(update.genres);
  }

  movie.updatedAt = new Date();

  return cloneMovie(movie);
};

export const deleteMovie = (movieId: string) => {
  const movieIndex = movies.findIndex((entry) => entry._id === movieId);

  if (movieIndex === -1) {
    return null;
  }

  const [deletedMovie] = movies.splice(movieIndex, 1);
  const remainingReviews = reviews.filter((review) => review.movieId !== movieId);
  reviews.length = 0;
  reviews.push(...remainingReviews);

  return cloneMovie(deletedMovie);
};

export const createReview = (input: { movieId: string; reviewer: string; rating: number; comment?: string }) => {
  const now = new Date();
  const review: Review = {
    _id: generateId(),
    movieId: input.movieId,
    reviewer: input.reviewer.trim(),
    rating: input.rating,
    comment: trimToUndefined(input.comment),
    createdAt: now,
    updatedAt: now,
  };

  reviews.push(review);
  return cloneReview(review);
};

export const listReviews = (movieId: string, page: number, limit: number) => {
  const filtered = sortNewestFirst(reviews.filter((review) => review.movieId === movieId));
  const total = filtered.length;
  const skip = (page - 1) * limit;

  return {
    data: filtered.slice(skip, skip + limit).map(cloneReview),
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const updateReview = (movieId: string, reviewId: string, update: { rating?: number; comment?: string }) => {
  const review = reviews.find((entry) => entry._id === reviewId && entry.movieId === movieId);

  if (!review) {
    return null;
  }

  if (update.rating !== undefined) {
    review.rating = update.rating;
  }

  if (update.comment !== undefined) {
    review.comment = trimToUndefined(update.comment);
  }

  review.updatedAt = new Date();

  return cloneReview(review);
};

export const deleteReview = (movieId: string, reviewId: string) => {
  const reviewIndex = reviews.findIndex((entry) => entry._id === reviewId && entry.movieId === movieId);

  if (reviewIndex === -1) {
    return null;
  }

  const [deletedReview] = reviews.splice(reviewIndex, 1);
  return cloneReview(deletedReview);
};

export const listWatchlistItems = () => sortNewestFirst(watchlistItems).map(cloneWatchlistItem);

export const createWatchlistItem = (input: { title: string; note?: string }) => {
  const now = new Date();
  const item: WatchlistItem = {
    _id: generateId(),
    title: input.title.trim(),
    note: trimToUndefined(input.note),
    createdAt: now,
    updatedAt: now,
  };

  watchlistItems.push(item);
  return cloneWatchlistItem(item);
};

export const deleteWatchlistItem = (itemId: string) => {
  const itemIndex = watchlistItems.findIndex((entry) => entry._id === itemId);

  if (itemIndex === -1) {
    return null;
  }

  const [deletedItem] = watchlistItems.splice(itemIndex, 1);
  return cloneWatchlistItem(deletedItem);
};

const getAverageRating = (movieId: string) => {
  return getAverageRatingMap(new Set([movieId])).get(movieId) ?? null;
};

const getAverageRatingMap = (movieIds: Set<string>) => {
  const totals = new Map<string, { count: number; total: number }>();

  for (const review of reviews) {
    if (!movieIds.has(review.movieId)) {
      continue;
    }

    const entry = totals.get(review.movieId) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += review.rating;
    totals.set(review.movieId, entry);
  }

  return new Map(
    [...totals.entries()].map(([movieId, value]) => [movieId, roundToOneDecimal(value.total / value.count)]),
  );
};
