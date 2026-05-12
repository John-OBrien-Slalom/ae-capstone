# Development Memory System

This memory system helps track patterns, decisions, and lessons learned during development so future work is faster, more consistent, and less repetitive.

## Purpose

Use memory to capture:
- Implementation patterns that should be reused
- Decisions and trade-offs made during feature work
- Debugging outcomes and lessons learned from linting/testing
- Session outcomes that provide future context

## Two Types of Memory

### 1) Persistent Memory (`.github/copilot-instructions.md`)
Foundational and stable guidance:
- Core engineering principles
- Standard workflows
- High-level project conventions

This is long-lived instruction memory.

### 2) Working Memory (`.github/memory/`)
Task and discovery focused memory:
- Session summaries
- Reusable code/debug patterns
- Active notes during current work

This is operational memory used while doing development.

## Directory Structure

- `.github/memory/session-notes.md`
  - Historical summaries of completed sessions
  - Committed to git
- `.github/memory/patterns-discovered.md`
  - Accumulated, reusable implementation and debugging patterns
  - Committed to git
- `.github/memory/scratch/working-notes.md`
  - Active session notes while work is in progress
  - Intended for ephemeral, in-progress thinking
- `.github/memory/scratch/.gitignore`
  - Keeps scratch content excluded by default

## When to Use Each File

### During TDD
- Use `scratch/working-notes.md` to track:
  - failing test intent
  - implementation attempts
  - pass/fail checkpoints
- Move final test strategy/outcomes into `session-notes.md`
- Capture reusable testing approaches in `patterns-discovered.md`

### During Linting and Build Fixes
- Use `scratch/working-notes.md` for:
  - active error lists
  - quick hypotheses
  - command outputs and next actions
- Record final root causes/resolutions in `session-notes.md`
- Save recurring lint/build remediation patterns in `patterns-discovered.md`

### During Debugging
- Track reproduction steps and temporary findings in `scratch/working-notes.md`
- Document final diagnosis and decision in `session-notes.md`
- Add repeatable debugging playbooks to `patterns-discovered.md`

## How AI Uses This Memory

When starting new work, AI should:
1. Read persistent guidance in `.github/copilot-instructions.md`
2. Read `patterns-discovered.md` for reusable approaches
3. Check `session-notes.md` for relevant historical context
4. Use `scratch/working-notes.md` only for active, current-session state

This helps produce context-aware, project-aligned suggestions and reduces repeated mistakes.

## Important Difference: Session vs Scratch Notes

- `session-notes.md`: completed-session summaries and outcomes, committed as historical record.
- `scratch/working-notes.md`: active working notes for in-progress tasks, intended to remain ephemeral and not become long-term history.

At session end, convert key conclusions from scratch notes into `session-notes.md` and relevant reusable items into `patterns-discovered.md`.
