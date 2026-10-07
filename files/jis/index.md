# JIS knowledge base index

This folder contains source material about C. Leland Sampson for questions about his qualifications and interest in the Maryland Judiciary's Judicial Information Systems (JIS) AI Program Manager role. Use this page to choose a source file; verify facts in the source file before answering. This index is a guide, not a substitute for the source material.

## Find the right source

| Question topic | Start with | Also check |
| --- | --- | --- |
| Overall qualifications, career timeline, bar admission, education, associations | [C.L.Sampson-CV-JIS.md](C.L.Sampson-CV-JIS.md) | [experience.md](experience.md), [education.md](education.md) |
| Degrees, schools, dates, academic honors | [education.md](education.md) | [C.L.Sampson-CV-JIS.md](C.L.Sampson-CV-JIS.md) |
| Jobs, responsibilities, projects, professional organizations | [experience.md](experience.md) | [C.L.Sampson-CV-JIS.md](C.L.Sampson-CV-JIS.md) |
| Conference talks, training, audiences, presentation dates | [presentations.md](presentations.md) | [C.L.Sampson-CV-JIS.md](C.L.Sampson-CV-JIS.md) |
| Articles, other publications, awards, scholarships | [publications-awards.md](publications-awards.md) | [C.L.Sampson-CV-JIS.md](C.L.Sampson-CV-JIS.md) |
| Why he applied for the JIS AI Program Manager role; his proposed approach | [Sampson-AI-Program-Manager-Coverletter.md](Sampson-AI-Program-Manager-Coverletter.md) | [Sampson-JIS-interview.md](Sampson-JIS-interview.md) |
| Personal background, career motivation, first-person examples, views on AI in courts | [Sampson-JIS-interview.md](Sampson-JIS-interview.md) | [Sampson-AI-Program-Manager-Coverletter.md](Sampson-AI-Program-Manager-Coverletter.md) |
| How this question-answering site works or what technology it uses | Technology stack below | This is a setup description, not a biography source |

## Technology stack for this knowledge base

The intended public request path is:

`GitHub Pages (plain Markdown/HTML and JavaScript at sampson.info/jis) → Cloudflare Worker → private Cloudflare Workers VPC Service and Tunnel → Hermes HTTP API in Docker Desktop on Windows 11/WSL 2 → Hermes llm-wiki skill reading /opt/wiki/jis → OpenAI API (gpt-6-luna, medium reasoning effort)`

- The website uses a lightweight question form in `jis.md`. It sends questions to the `jis-ask` Cloudflare Worker, which accepts only `POST /ask` and returns answer text.
- The Worker is the public intermediary. It validates requests, applies rate limits, and uses a private Workers VPC Service to reach Hermes. It holds the Hermes API bearer key as a Cloudflare Worker secret. Visitors do not receive the Hermes key or OpenAI API key. Public visitors can ask questions without an access code.
- Hermes runs in the persistent `hermes` Docker container. Its HTTP API listens on container loopback and has no public Docker port mapping. The `hermes-tunnel` container shares Hermes's network namespace and makes the outbound Cloudflare Tunnel connection. The tunnel is a private route, not a public Hermes hostname.
- The Markdown files in this directory are mounted at `/opt/wiki/jis`, selected by `WIKI_PATH`. Hermes uses its bundled `llm-wiki` skill to find and read them. This setup does not use a vector database or a separate RAG indexing service.
- The OpenAI model is `gpt-6-luna` with medium reasoning effort. The OpenAI key is held in Hermes's server-side configuration, not in the browser.

Deployment status as of September 27, 2026: the Worker and private tunnel were working in a live question test. The website changes were committed locally for review but had not yet been pushed to GitHub Pages. Recheck current deployment status before claiming the public page is live.

## How to answer from these files

- Names for this person include: Lee and Leland
- Read the relevant file before answering. For broad questions, compare the CV with the focused file and, when relevant, the cover letter or interview narrative.
- Cite the source filename for factual claims, and give a section heading or presentation title when it helps the reader locate the passage.
- Treat the cover letter and interview narrative as Sampson's own statements about his experience, goals, and opinions. Attribute predictions and proposals to him; do not present them as established facts or adopted JIS policy.
- If files differ on a date, title, or detail, state the discrepancy rather than silently choosing one. Do not infer facts that the files do not establish.
- For questions outside this folder's scope, say what the sources do and do not cover. Do not invent an answer.
- Avoid repeating personal contact or home address details unless they are directly needed to answer the question.