---
name: commit
description: Write a commit message for the staged git changes. Use when the user asks for a commit message.
---

# Commit message

Write a commit message for what is staged in git. The user commits it themselves.

## Rules

- Base the message only on the staged changes (`git diff --cached`). Ignore unstaged and untracked files, except to notice that something seems to be missing from the staging.
- Never add a `Co-Authored-By` line or anything else saying an agent helped write the change.
- Output only the commit message, with no other text and no code fence, so the user can copy and paste it.
- If the staged changes look like they contain a mistake or oversight, do not write a message. Describe the problem instead, so the user can fix it and try again. If nothing is staged, say so.
- Only use read-only git commands.

## What counts as a problem

Anything that suggests the commit isn't what the user intends: changes that look incomplete or half-staged, leftover debug code or conflict markers, secrets, unrelated changes that belong in separate commits, broken references, or violations of the project rules in `AGENTS.md`. If something is unusual but plausibly intentional, write the message.

## Style

Use an imperative summary line of about 50 characters. For anything beyond a trivial change, add a blank line and then a short body, wrapped at 72 columns, that explains what changed and why.
