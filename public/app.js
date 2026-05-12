/* ── State ─────────────────────────────────────────────────────── */
let currentPage = 1;
let totalPages = 1;
let searchQuery = "";
let ratedOnly = false;
let currentMovieId = null;
let addMoviePanelOpen = false;

/* ── API helpers ───────────────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

const api = {
  getMovies: (search, rated, page) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (rated) params.set("rated", "true");
    params.set("page", String(page));
    params.set("limit", "20");
    return apiFetch(`/movies?${params}`);
  },
  createMovie: (body) => apiFetch("/movies", { method: "POST", body: JSON.stringify(body) }),
  deleteMovie: (id) => apiFetch(`/movies/${id}`, { method: "DELETE" }),

  getReviews: (movieId) => apiFetch(`/movies/${movieId}/reviews?limit=100`),
  createReview: (movieId, body) =>
    apiFetch(`/movies/${movieId}/reviews`, { method: "POST", body: JSON.stringify(body) }),
  updateReview: (movieId, reviewId, body) =>
    apiFetch(`/movies/${movieId}/reviews/${reviewId}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteReview: (movieId, reviewId) =>
    apiFetch(`/movies/${movieId}/reviews/${reviewId}`, { method: "DELETE" }),

  getWatchlist: () => apiFetch("/watchlist"),
  addToWatchlist: (body) => apiFetch("/watchlist", { method: "POST", body: JSON.stringify(body) }),
  removeFromWatchlist: (id) => apiFetch(`/watchlist/${id}`, { method: "DELETE" }),
};

/* ── Toast notifications ───────────────────────────────────────── */
function toast(message, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ── Stars rendering ───────────────────────────────────────────── */
function starsHtml(rating) {
  if (rating == null) return "";
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

/* ── Navigation ────────────────────────────────────────────────── */
document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.section;
    document.querySelectorAll("nav button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
    document.getElementById(target).classList.add("active");
    if (target === "watchlist") loadWatchlist();
  });
});

/* ── Movie list ────────────────────────────────────────────────── */
async function loadMovies() {
  const container = document.getElementById("movies-container");
  container.innerHTML = '<div class="loading">Loading movies…</div>';
  try {
    const data = await api.getMovies(searchQuery, ratedOnly, currentPage);
    totalPages = data.totalPages || 1;
    renderMovies(data.data, data.total, data.page, data.totalPages);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Error loading movies: ${err.message}</p></div>`;
  }
}

function renderMovies(movies, total, page, tPages) {
  const container = document.getElementById("movies-container");
  const pagination = document.getElementById("pagination");

  if (!movies || movies.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><p>No movies found.</p><p>Add one to get started!</p></div>';
    pagination.style.display = "none";
    return;
  }

  container.innerHTML = `<div class="movies-grid">${movies.map(movieCardHtml).join("")}</div>`;

  // Pagination
  const pageInfo = document.getElementById("page-info");
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");

  if (tPages > 1) {
    pagination.style.display = "flex";
    pageInfo.textContent = `Page ${page} of ${tPages} (${total} movies)`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= tPages;
  } else {
    pagination.style.display = total > 0 ? "flex" : "none";
    pageInfo.textContent = `${total} movie${total !== 1 ? "s" : ""}`;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  }

  // Card event listeners
  container.querySelectorAll("[data-movie-id]").forEach((el) => {
    const id = el.dataset.movieId;
    el.querySelector(".btn-view-movie").addEventListener("click", () => openMovieModal(id));
    el.querySelector(".btn-delete-movie").addEventListener("click", () => deleteMovie(id));
  });
}

function movieCardHtml(movie) {
  const genres = (movie.genres || []).map((g) => `<span class="genre-tag">${g}</span>`).join("");
  const yearText = movie.releaseYear ? `<span>${movie.releaseYear}</span>` : "";
  const avgRating =
    movie.averageRating != null
      ? `<div class="rating-display"><span class="stars">${starsHtml(movie.averageRating)}</span><span>${movie.averageRating}/5</span></div>`
      : `<div class="stars-empty">No ratings yet</div>`;

  return `
    <div class="movie-card" data-movie-id="${movie._id}">
      <div class="movie-title">${escHtml(movie.title)}</div>
      <div class="movie-meta">${yearText}${genres}</div>
      ${avgRating}
      <div class="card-actions">
        <button class="btn btn-secondary btn-sm btn-view-movie">Reviews</button>
        <button class="btn btn-danger btn-delete-movie">Delete</button>
      </div>
    </div>`;
}

async function deleteMovie(id) {
  if (!confirm("Delete this movie and all its reviews?")) return;
  try {
    await api.deleteMovie(id);
    toast("Movie deleted");
    loadMovies();
  } catch (err) {
    toast(`Failed to delete: ${err.message}`, "error");
  }
}

/* ── Add movie form ────────────────────────────────────────────── */
document.getElementById("open-add-movie").addEventListener("click", () => {
  addMoviePanelOpen = !addMoviePanelOpen;
  document.getElementById("add-movie-panel").style.display = addMoviePanelOpen ? "block" : "none";
});

document.getElementById("cancel-add-movie").addEventListener("click", () => {
  addMoviePanelOpen = false;
  document.getElementById("add-movie-panel").style.display = "none";
  clearAddMovieForm();
});

function resetMovieFilters() {
  searchQuery = "";
  ratedOnly = false;
  document.getElementById("search-input").value = "";
  document.getElementById("rated-only").checked = false;
  document.getElementById("rated-toggle").classList.remove("on");
}

document.getElementById("save-movie").addEventListener("click", async () => {
  const title = document.getElementById("new-title").value.trim();
  const yearVal = document.getElementById("new-year").value.trim();
  const genresVal = document.getElementById("new-genres").value.trim();

  if (!title) {
    toast("Title is required", "error");
    return;
  }

  const body = { title };
  if (yearVal) body.releaseYear = Number(yearVal);
  if (genresVal) body.genres = genresVal.split(",").map((g) => g.trim()).filter(Boolean);

  try {
    const movie = await api.createMovie(body);
    const movieTitle = movie && typeof movie === "object" && typeof movie.title === "string" ? movie.title : "";
    const normalizedSearchQuery = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || movieTitle.toLowerCase().includes(normalizedSearchQuery);

    if (!matchesSearch || ratedOnly) {
      resetMovieFilters();
    }

    toast("Movie added!");
    clearAddMovieForm();
    addMoviePanelOpen = false;
    document.getElementById("add-movie-panel").style.display = "none";
    currentPage = 1;
    await loadMovies();
  } catch (err) {
    toast(`Failed to add movie: ${err.message}`, "error");
  }
});

function clearAddMovieForm() {
  document.getElementById("new-title").value = "";
  document.getElementById("new-year").value = "";
  document.getElementById("new-genres").value = "";
}

/* ── Search ────────────────────────────────────────────────────── */
let searchTimeout;
document.getElementById("search-input").addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = e.target.value.trim();
    currentPage = 1;
    loadMovies();
  }, 350);
});

/* ── Rated-only filter ─────────────────────────────────────────── */
const ratedToggle = document.getElementById("rated-toggle");
document.getElementById("rated-only").addEventListener("change", (e) => {
  ratedOnly = e.target.checked;
  ratedToggle.classList.toggle("on", ratedOnly);
  currentPage = 1;
  loadMovies();
});

/* ── Pagination ────────────────────────────────────────────────── */
document.getElementById("prev-page").addEventListener("click", () => {
  if (currentPage > 1) { currentPage--; loadMovies(); }
});
document.getElementById("next-page").addEventListener("click", () => {
  if (currentPage < totalPages) { currentPage++; loadMovies(); }
});

/* ── Movie detail modal ────────────────────────────────────────── */
async function openMovieModal(movieId) {
  currentMovieId = movieId;
  resetReviewForm();

  const modal = document.getElementById("movie-modal");
  modal.classList.add("open");

  // Clear previous content
  document.getElementById("modal-movie-title").textContent = "Loading…";
  document.getElementById("modal-movie-meta").innerHTML = "";
  document.getElementById("modal-avg-rating").innerHTML = "";
  document.getElementById("reviews-container").innerHTML = '<div class="loading">Loading…</div>';

  try {
    const [movie, reviewData] = await Promise.all([
      apiFetch(`/movies/${movieId}`),
      api.getReviews(movieId),
    ]);

    document.getElementById("modal-movie-title").textContent = movie.title;

    const metaParts = [];
    if (movie.releaseYear) metaParts.push(`<span>${movie.releaseYear}</span>`);
    (movie.genres || []).forEach((g) => metaParts.push(`<span class="genre-tag">${g}</span>`));
    document.getElementById("modal-movie-meta").innerHTML = metaParts.join("");

    const avgEl = document.getElementById("modal-avg-rating");
    if (movie.averageRating != null) {
      avgEl.innerHTML = `<div class="rating-display"><span class="stars">${starsHtml(movie.averageRating)}</span><span style="font-size:0.9rem;color:var(--text-muted)">Avg ${movie.averageRating}/5</span></div>`;
    } else {
      avgEl.innerHTML = `<div class="stars-empty">No ratings yet</div>`;
    }

    renderReviews(reviewData.data || []);
  } catch (err) {
    toast(`Failed to load movie: ${err.message}`, "error");
    closeModal();
  }
}

function renderReviews(reviews) {
  const container = document.getElementById("reviews-container");
  if (!reviews || reviews.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:1.5rem"><p>No ratings yet. Be the first!</p></div>';
    return;
  }
  container.innerHTML = reviews.map((r) => reviewItemHtml(r)).join("");

  // Wire up edit/delete buttons
  container.querySelectorAll("[data-review-id]").forEach((el) => {
    const reviewId = el.dataset.reviewId;
    el.querySelector(".btn-delete-review").addEventListener("click", () =>
      deleteReview(currentMovieId, reviewId)
    );
    el.querySelector(".btn-edit-review").addEventListener("click", () =>
      toggleEditForm(el, reviewId)
    );

    // Edit form star picker
    const starPicker = el.querySelector(".edit-star-picker");
    const hiddenInput = el.querySelector(".edit-rating-input");
    let editRating = Number(hiddenInput.value) || 0;
    setStarPicker(starPicker, editRating);

    starPicker.querySelectorAll(".star").forEach((star) => {
      star.addEventListener("click", () => {
        editRating = Number(star.dataset.value);
        hiddenInput.value = editRating;
        setStarPicker(starPicker, editRating);
      });
    });

    el.querySelector(".btn-save-edit").addEventListener("click", async () => {
      const rating = Number(el.querySelector(".edit-rating-input").value);
      const comment = el.querySelector(".edit-comment-input").value.trim();
      if (!rating) { toast("Please select a rating", "error"); return; }
      try {
        await api.updateReview(currentMovieId, reviewId, { rating, comment: comment || undefined });
        toast("Review updated!");
        refreshModal();
      } catch (err) {
        toast(`Failed to update: ${err.message}`, "error");
      }
    });

    el.querySelector(".btn-cancel-edit").addEventListener("click", () => {
      el.querySelector(".edit-review-form").classList.remove("open");
    });
  });
}

function reviewItemHtml(review) {
  const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
  const comment = review.comment ? `<div class="review-comment">${escHtml(review.comment)}</div>` : "";
  return `
    <div class="review-item" data-review-id="${review._id}">
      <div class="review-header">
        <span class="review-reviewer">${escHtml(review.reviewer)}</span>
        <span class="review-rating">${stars}</span>
      </div>
      ${comment}
      <div class="review-actions">
        <button class="btn btn-edit btn-edit-review">Edit</button>
        <button class="btn btn-danger btn-delete-review">Delete</button>
      </div>
      <div class="edit-review-form">
        <div class="form-row">
          <div class="form-group">
            <label>New Rating</label>
            <div class="star-picker edit-star-picker">
              <span class="star" data-value="1">★</span>
              <span class="star" data-value="2">★</span>
              <span class="star" data-value="3">★</span>
              <span class="star" data-value="4">★</span>
              <span class="star" data-value="5">★</span>
            </div>
            <input type="hidden" class="edit-rating-input" value="${review.rating}" />
          </div>
          <div class="form-group" style="flex:2">
            <label>Comment</label>
            <textarea class="edit-comment-input">${escHtml(review.comment || "")}</textarea>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary btn-sm btn-cancel-edit">Cancel</button>
          <button class="btn btn-primary btn-sm btn-save-edit">Save</button>
        </div>
      </div>
    </div>`;
}

function toggleEditForm(el, reviewId) {
  const form = el.querySelector(".edit-review-form");
  form.classList.toggle("open");
}

async function deleteReview(movieId, reviewId) {
  if (!confirm("Delete this review?")) return;
  try {
    await api.deleteReview(movieId, reviewId);
    toast("Review deleted");
    refreshModal();
  } catch (err) {
    toast(`Failed to delete: ${err.message}`, "error");
  }
}

async function refreshModal() {
  if (!currentMovieId) return;
  try {
    const [movie, reviewData] = await Promise.all([
      apiFetch(`/movies/${currentMovieId}`),
      api.getReviews(currentMovieId),
    ]);
    const avgEl = document.getElementById("modal-avg-rating");
    if (movie.averageRating != null) {
      avgEl.innerHTML = `<div class="rating-display"><span class="stars">${starsHtml(movie.averageRating)}</span><span style="font-size:0.9rem;color:var(--text-muted)">Avg ${movie.averageRating}/5</span></div>`;
    } else {
      avgEl.innerHTML = `<div class="stars-empty">No ratings yet</div>`;
    }
    renderReviews(reviewData.data || []);
    loadMovies(); // refresh card avg rating
  } catch (err) {
    toast(`Failed to refresh: ${err.message}`, "error");
  }
}

/* ── Close modal ───────────────────────────────────────────────── */
document.getElementById("close-modal").addEventListener("click", closeModal);
document.getElementById("movie-modal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("movie-modal")) closeModal();
});

function closeModal() {
  document.getElementById("movie-modal").classList.remove("open");
  currentMovieId = null;
  resetReviewForm();
}

/* ── Add review (star picker) ──────────────────────────────────── */
let addRating = 0;

function resetReviewForm() {
  document.getElementById("rev-reviewer").value = "";
  document.getElementById("rev-comment").value = "";
  addRating = 0;
  document.getElementById("rev-rating").value = "";
  setStarPicker(document.getElementById("add-star-picker"), 0);
}

document.getElementById("add-star-picker").querySelectorAll(".star").forEach((star) => {
  star.addEventListener("click", () => {
    addRating = Number(star.dataset.value);
    document.getElementById("rev-rating").value = addRating;
    setStarPicker(document.getElementById("add-star-picker"), addRating);
  });
});

function setStarPicker(picker, value) {
  picker.querySelectorAll(".star").forEach((s) => {
    s.classList.toggle("on", Number(s.dataset.value) <= value);
  });
}

document.getElementById("submit-review").addEventListener("click", async () => {
  const reviewer = document.getElementById("rev-reviewer").value.trim();
  const rating = addRating;
  const comment = document.getElementById("rev-comment").value.trim();

  if (!reviewer) { toast("Your name is required", "error"); return; }
  if (!rating) { toast("Please select a rating", "error"); return; }

  try {
    await api.createReview(currentMovieId, { reviewer, rating, comment: comment || undefined });
    toast("Rating submitted!");
    resetReviewForm();
    refreshModal();
  } catch (err) {
    toast(`Failed to submit: ${err.message}`, "error");
  }
});

/* ── Watchlist ─────────────────────────────────────────────────── */
async function loadWatchlist() {
  const container = document.getElementById("watchlist-container");
  container.innerHTML = '<div class="loading">Loading watchlist…</div>';
  try {
    const items = await api.getWatchlist();
    renderWatchlist(items);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Error loading watchlist: ${err.message}</p></div>`;
  }
}

function renderWatchlist(items) {
  const container = document.getElementById("watchlist-container");
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Your watchlist is empty.</p><p>Add movies you want to see!</p></div>';
    return;
  }
  container.innerHTML = `<div class="watchlist-list">${items.map(watchlistItemHtml).join("")}</div>`;
  container.querySelectorAll("[data-wl-id]").forEach((el) => {
    el.querySelector(".btn-remove-wl").addEventListener("click", () =>
      removeFromWatchlist(el.dataset.wlId)
    );
  });
}

function watchlistItemHtml(item) {
  const note = item.note ? `<div class="watchlist-note">${escHtml(item.note)}</div>` : "";
  return `
    <div class="watchlist-item" data-wl-id="${item._id}">
      <div class="watchlist-item-info">
        <div class="watchlist-title">${escHtml(item.title)}</div>
        ${note}
      </div>
      <button class="btn btn-danger btn-sm btn-remove-wl">Remove</button>
    </div>`;
}

document.getElementById("save-watchlist").addEventListener("click", async () => {
  const title = document.getElementById("wl-title").value.trim();
  const note = document.getElementById("wl-note").value.trim();
  if (!title) { toast("Title is required", "error"); return; }
  try {
    await api.addToWatchlist({ title, note: note || undefined });
    toast("Added to watchlist!");
    document.getElementById("wl-title").value = "";
    document.getElementById("wl-note").value = "";
    loadWatchlist();
  } catch (err) {
    toast(`Failed to add: ${err.message}`, "error");
  }
});

async function removeFromWatchlist(id) {
  if (!confirm("Remove from watchlist?")) return;
  try {
    await api.removeFromWatchlist(id);
    toast("Removed from watchlist");
    loadWatchlist();
  } catch (err) {
    toast(`Failed to remove: ${err.message}`, "error");
  }
}

/* ── Utility ───────────────────────────────────────────────────── */
function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Boot ──────────────────────────────────────────────────────── */
loadMovies();
