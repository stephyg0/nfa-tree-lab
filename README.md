# Automata Lab

DFA/NFA/PDA diagrams, computation trees, PNG/SVG/clipboard export, and a question screenshot importer.

## Build and checks

```sh
node scripts/build.mjs
node tests/pda.cjs
node tests/symbols.cjs
node tests/workbench.cjs
node tests/import-server.mjs
node tests/question-import.cjs
node scripts/preview.mjs
```

Editable browser code is in `public/`; `server/import.mjs` handles AI requests. The build embeds the assets into a standalone Sites Worker at `dist/server/index.js`. Preview uses no API credentials and shows the pending-setup state.

## AI setup still required

Set `OPENAI_API_KEY` as a **Sites runtime secret** using the OpenAI Developers setup flow. Never put credentials in browser code or Git. Optional `OPENAI_MODEL` defaults to `gpt-4.1`. Until configured, manual diagrams continue to work and the importer displays an explicit pending-setup notice.

The importer accepts PNG/JPEG/WebP images up to 6 MB or text up to 12,000 characters. It sends them to OpenAI only when Read question is clicked, uses Responses structured output with `store: false`, and does not persist uploaded images/questions in application storage. Provider data handling still applies. Requests require Sites-authenticated identity and same-origin POSTs. The site must retain its private access policy.

Output is a proposed machine, not a correctness guarantee. Users review transcription, assumptions and editable transitions, then explicitly apply the draft. Unclear or unsupported questions are returned for clarification. The editor validates machine syntax and DFA completeness before replacement. Importer tests use mocked AI outputs; live model/image recognition has not been tested pending setup.

API references: https://developers.openai.com/api/docs/guides/images-vision and https://developers.openai.com/api/docs/guides/structured-outputs
