import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { once } from "node:events";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

const getAvailablePort = async () => {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();

  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Failed to determine available port");
  }

  const { port } = address;
  server.close();
  await once(server, "close");
  return port;
};

const waitForServer = async (baseUrl: string) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);

      if (response.ok) {
        return;
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Server did not start at ${baseUrl}`);
};

const startServer = async () => {
  const port = await getAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const serverPath = path.join(__dirname, "index.js");
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stderr: string[] = [];
  child.stderr.on("data", (chunk) => {
    stderr.push(chunk.toString());
  });

  try {
    await waitForServer(baseUrl);
    return { child, baseUrl, stderr };
  } catch (error) {
    child.kill("SIGTERM");
    await once(child, "exit");
    throw new Error(`${String(error)}\n${stderr.join("")}`);
  }
};

const stopServer = async (child: ChildProcess) => {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  await once(child, "exit");
};

const requestJson = async (baseUrl: string, pathname: string, init?: RequestInit) => {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await response.json().catch(() => null);
  return { response, body };
};

test("movie endpoints validate input and support CRUD", async () => {
  const { child, baseUrl } = await startServer();

  try {
    const health = await requestJson(baseUrl, "/health");
    assert.equal(health.response.status, 200);
    assert.deepEqual(health.body, { status: "ok" });

    const invalidCreate = await requestJson(baseUrl, "/movies", { method: "POST", body: JSON.stringify({}) });
    assert.equal(invalidCreate.response.status, 400);

    const created = await requestJson(baseUrl, "/movies", {
      method: "POST",
      body: JSON.stringify({ title: "Heat", releaseYear: 1995, genres: ["Crime", " Drama "] }),
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.title, "Heat");

    const movieId = created.body._id;
    const list = await requestJson(baseUrl, "/movies?search=hea&year=1995");
    assert.equal(list.response.status, 200);
    assert.equal(list.body.total, 1);

    const invalidUpdate = await requestJson(baseUrl, `/movies/${movieId}`, {
      method: "PUT",
      body: JSON.stringify({ releaseYear: 1800 }),
    });
    assert.equal(invalidUpdate.response.status, 400);

    const updated = await requestJson(baseUrl, `/movies/${movieId}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Heat (Updated)", genres: ["Thriller"] }),
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.title, "Heat (Updated)");

    const fetched = await requestJson(baseUrl, `/movies/${movieId}`);
    assert.equal(fetched.response.status, 200);
    assert.equal(fetched.body.averageRating, null);

    const deleted = await requestJson(baseUrl, `/movies/${movieId}`, { method: "DELETE" });
    assert.equal(deleted.response.status, 200);

    const missing = await requestJson(baseUrl, `/movies/${movieId}`);
    assert.equal(missing.response.status, 404);
  } finally {
    await stopServer(child);
  }
});

test("review endpoints validate input and support lifecycle operations", async () => {
  const { child, baseUrl } = await startServer();

  try {
    const createdMovie = await requestJson(baseUrl, "/movies", {
      method: "POST",
      body: JSON.stringify({ title: "Interstellar" }),
    });
    const movieId = createdMovie.body._id;

    const invalidReview = await requestJson(baseUrl, `/movies/${movieId}/reviews`, {
      method: "POST",
      body: JSON.stringify({ reviewer: "Cooper", rating: 6 }),
    });
    assert.equal(invalidReview.response.status, 400);

    const createdReview = await requestJson(baseUrl, `/movies/${movieId}/reviews`, {
      method: "POST",
      body: JSON.stringify({ reviewer: "Cooper", rating: 5, comment: "Love it" }),
    });
    assert.equal(createdReview.response.status, 201);

    const reviewId = createdReview.body._id;

    const listed = await requestJson(baseUrl, `/movies/${movieId}/reviews?limit=5`);
    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.total, 1);

    const emptyUpdate = await requestJson(baseUrl, `/movies/${movieId}/reviews/${reviewId}`, {
      method: "PUT",
      body: JSON.stringify({}),
    });
    assert.equal(emptyUpdate.response.status, 400);

    const updated = await requestJson(baseUrl, `/movies/${movieId}/reviews/${reviewId}`, {
      method: "PUT",
      body: JSON.stringify({ rating: 4, comment: "Still great" }),
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.rating, 4);

    const movie = await requestJson(baseUrl, `/movies/${movieId}`);
    assert.equal(movie.response.status, 200);
    assert.equal(movie.body.averageRating, 4);

    const deleted = await requestJson(baseUrl, `/movies/${movieId}/reviews/${reviewId}`, { method: "DELETE" });
    assert.equal(deleted.response.status, 200);

    const missing = await requestJson(baseUrl, `/movies/${movieId}/reviews/${reviewId}`, { method: "DELETE" });
    assert.equal(missing.response.status, 404);
  } finally {
    await stopServer(child);
  }
});

test("watchlist endpoints support CRUD and expose titles in the movie list", async () => {
  const { child, baseUrl } = await startServer();

  try {
    const empty = await requestJson(baseUrl, "/watchlist");
    assert.equal(empty.response.status, 200);
    assert.deepEqual(empty.body, []);

    const invalidCreate = await requestJson(baseUrl, "/watchlist", {
      method: "POST",
      body: JSON.stringify({ note: "Missing title" }),
    });
    assert.equal(invalidCreate.response.status, 400);

    const created = await requestJson(baseUrl, "/watchlist", {
      method: "POST",
      body: JSON.stringify({ title: "Arrival", note: "Soon" }),
    });
    assert.equal(created.response.status, 201);

    const duplicateTitle = await requestJson(baseUrl, "/watchlist", {
      method: "POST",
      body: JSON.stringify({ title: " arrival " }),
    });
    assert.equal(duplicateTitle.response.status, 201);

    const watchlist = await requestJson(baseUrl, "/watchlist");
    assert.equal(watchlist.response.status, 200);
    assert.equal(watchlist.body.length, 2);

    const movies = await requestJson(baseUrl, "/movies?search=arrival");
    assert.equal(movies.response.status, 200);
    assert.equal(movies.body.total, 1);
    assert.equal(movies.body.data[0].title, "Arrival");

    const deleted = await requestJson(baseUrl, `/watchlist/${created.body._id}`, { method: "DELETE" });
    assert.equal(deleted.response.status, 200);

    const missing = await requestJson(baseUrl, `/watchlist/${created.body._id}`, { method: "DELETE" });
    assert.equal(missing.response.status, 404);
  } finally {
    await stopServer(child);
  }
});
