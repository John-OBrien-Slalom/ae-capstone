# Copilot Instructions

## Agent Usage
- Follow existing repository conventions and keep changes minimal and focused.
- Prefer incremental updates with validation after meaningful changes.
- Preserve backward compatibility unless a requirement explicitly changes behavior.

## Memory System
- Persistent Memory: This file (`.github/copilot-instructions.md`) contains foundational principles and workflows
- Working Memory: `.github/memory/` directory contains discoveries and patterns
- During active development, take notes in `.github/memory/scratch/working-notes.md` (not committed)
- At end of session, summarize key findings into `.github/memory/session-notes.md` (committed)
- Document recurring code patterns in `.github/memory/patterns-discovered.md` (committed)
- Reference these files when providing context-aware suggestions
