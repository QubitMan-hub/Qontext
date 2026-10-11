# Memory

Qontext keeps its project memory in this repository, at `.claude/memory/`, so it travels with the code to
every machine and every session. (The memory plugin's default home-folder location does not survive cloud
workspaces.) The index is `.claude/memory/MEMORY.md`.

## Recall, before responding

Check memory when the message involves past decisions, preferences, system knowledge or prior work. Skip
when the topic is already fully in context. Read the index, pick the entries whose descriptions match, and
load only those.

## Remember, after responding

1. Does the exchange contain a directive from the owner, a reasoned conclusion, or a durable fact? If not,
   stop.
2. Does an overlapping memory exist? Update it if this adds to it, replace it if this contradicts it,
   otherwise create a new file.
3. Is it worth storing? Keep what needs several sources to rebuild, or what only the owner could tell you.
   Skip anything one search or one look at the code would recover.

## File format

One memory per file in `.claude/memory/`, kebab-case names:

```markdown
---
name: descriptive-name
description: one-line summary for relevance matching
type: feedback | project | reference
---

The rule or fact.

**Why:** the reason behind it.

**How to apply:** when and where it matters.
```

This repository may become public, so personal details about the owner stay out of it (they live in the
owner's own Claude memory instead). Never store secrets, keys or tokens.

## What not to save

- Code patterns or architecture you can read from the code or `docs/`
- Git history (`git log` is the record)
- Debugging solutions (the fix is in the code)
- Details that only matter for the current session

After creating or changing a memory, update its line in `MEMORY.md`.
