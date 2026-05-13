import test from "node:test";
import assert from "node:assert/strict";
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
  resetInMemoryStorage,
  updateMovie,
  updateReview,
} from "./storage/inMemory";

test.beforeEach(() => {
  resetInMemoryStorage();
});

test("movie storage supports filtering, updates, ratings, and cascade delete", () => {
  const arrival = createMovie({ title: " Arrival ", releaseYear: 2016, genres: ["Sci-Fi", " Drama ", "", 42] });
  const alien = createMovie({ title: "Alien", releaseYear: 1979, genres: ["Sci-Fi", "Horror"] });
  createMovie({ title: "Amelie", releaseYear: 2001, genres: ["Romance"] });

  assert.equal(isValidId(arrival._id), true);
  assert.deepEqual(arrival.genres, ["Sci-Fi", "Drama"]);

  createReview({ movieId: arrival._id, reviewer: "A", rating: 4, comment: " Great " });
  createReview({ movieId: arrival._id, reviewer: "B", rating: 5 });
  createReview({ movieId: alien._id, reviewer: "C", rating: 3 });

  const ratedOnly = listMovies({ ratedOnly: true, page: 1, limit: 10 });
  assert.equal(ratedOnly.total, 2);

  const searched = listMovies({ search: "arr", page: 1, limit: 10 });
  assert.equal(searched.total, 1);
  assert.equal(searched.data[0]?.title, "Arrival");
  assert.equal(searched.data[0]?.averageRating, 4.5);

  const filteredByGenre = listMovies({ genre: "Sci-Fi", page: 1, limit: 10 });
  assert.equal(filteredByGenre.total, 2);

  const filteredByYear = listMovies({ year: 1979, page: 1, limit: 10 });
  assert.equal(filteredByYear.total, 1);
  assert.equal(filteredByYear.data[0]?.title, "Alien");

  const paged = listMovies({ page: 2, limit: 2 });
  assert.equal(paged.total, 3);
  assert.equal(paged.totalPages, 2);
  assert.equal(paged.data.length, 1);

  const updated = updateMovie(arrival._id, { title: "Arrival (Updated)", genres: [" First Contact ", 42] });
  assert.equal(updated?.title, "Arrival (Updated)");
  assert.deepEqual(updated?.genres, ["First Contact"]);

  const movieWithAverage = getMovieWithAverageRating(arrival._id);
  assert.equal(movieWithAverage?.averageRating, 4.5);

  const deletedMovie = deleteMovie(arrival._id);
  assert.equal(deletedMovie?.title, "Arrival (Updated)");
  assert.equal(getMovie(arrival._id), null);
  assert.equal(listReviews(arrival._id, 1, 10).total, 0);
});

test("review storage supports updates, trimming, pagination, and missing records", () => {
  const movie = createMovie({ title: "Blade Runner" });
  const firstReview = createReview({ movieId: movie._id, reviewer: "Deckard", rating: 5, comment: "  noir  " });
  createReview({ movieId: movie._id, reviewer: "Roy", rating: 4 });

  const pageOne = listReviews(movie._id, 1, 1);
  assert.equal(pageOne.total, 2);
  assert.equal(pageOne.totalPages, 2);
  assert.equal(pageOne.data.length, 1);

  const updated = updateReview(movie._id, firstReview._id, { rating: 3, comment: "   " });
  assert.equal(updated?.rating, 3);
  assert.equal(updated?.comment, undefined);

  assert.equal(updateReview(movie._id, "0123456789abcdef01234567", { rating: 2 }), null);

  const deleted = deleteReview(movie._id, firstReview._id);
  assert.equal(deleted?._id, firstReview._id);
  assert.equal(deleteReview(movie._id, firstReview._id), null);
});

test("watchlist storage adds listable movies without duplicate movie records and supports removal", () => {
  const firstItem = createWatchlistItem({ title: "Dune", note: "  IMAX  " });
  createWatchlistItem({ title: " dune " });

  const watchlist = listWatchlistItems();
  assert.equal(watchlist.length, 2);
  const actualWatchlistEntries = watchlist
    .map((item) => JSON.stringify({ title: item.title, note: item.note }))
    .sort();
  const expectedWatchlistEntries = [
    JSON.stringify({ title: "Dune", note: "IMAX" }),
    JSON.stringify({ title: "dune", note: undefined }),
  ].sort();
  assert.deepEqual(actualWatchlistEntries, expectedWatchlistEntries);

  const movies = listMovies({ page: 1, limit: 10 });
  assert.equal(movies.total, 1);
  assert.equal(movies.data[0]?.title, "Dune");

  const removed = deleteWatchlistItem(firstItem._id);
  assert.equal(removed?._id, firstItem._id);
  assert.equal(deleteWatchlistItem(firstItem._id), null);
});
