# Development Conventions

- `backend/seeds/articles/` stores large test article bodies.
- Unless a task explicitly asks to change test article content, do not proactively read Markdown files in `backend/seeds/articles/`.
- Prefer `backend/seeds/developmentSeed.js` and the article manifest file to understand the Seed structure.
- When modifying business logic, do not scan all test article content.
