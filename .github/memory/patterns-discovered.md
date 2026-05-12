# Patterns Discovered

Capture reusable implementation patterns discovered over time.

## Pattern Template

### Pattern Name
- **Context:** <where this pattern applies>
- **Problem:** <what issue appears repeatedly>
- **Solution:** <the recommended approach>
- **Example:**
  ```ts
  // minimal code example
  ```
- **Related Files:** <paths to representative files>

---

## Example Pattern: Service Initialization (empty array vs null)

- **Context:** Service and state initialization paths in TypeScript applications.
- **Problem:** Using `null` for collection-like state forces repeated null checks and increases branching.
- **Solution:** Initialize list-like values to `[]` instead of `null` unless tri-state semantics are explicitly required.
- **Example:**
  ```ts
  // Prefer
  const movies: Movie[] = [];

  // Avoid unless null has explicit semantic meaning
  const reviews: Review[] | null = null;
  ```
- **Related Files:**
  - `src/index.ts`
  - `src/models/Movie.ts`
  - `src/models/Review.ts`
