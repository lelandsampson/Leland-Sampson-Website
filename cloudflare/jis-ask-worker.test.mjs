import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./jis-ask-worker.js", import.meta.url), "utf8");
const { default: worker } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const site = "https://sampson.info";
let upstreamCalled = false;
const env = {
  HERMES_API_KEY: "test-key",
  QUESTION_LIMIT: { async limit() { return { success: true }; } },
  SITE_LIMIT: { async limit() { return { success: true }; } },
  HERMES_VPC: {
    async fetch(url, options) {
      upstreamCalled = true;
      assert.equal(url, "http://127.0.0.1:8642/v1/chat/completions");
      assert.equal(options.headers.Authorization, "Bearer test-key");
      const body = JSON.parse(options.body);
      assert.equal(body.messages[1].content, "What is JIS?");
      return Response.json({ choices: [{ message: { content: "A wiki-based answer." } }] });
    }
  }
};

const request = (url, options = {}) => new Request(url, options);
let response = await worker.fetch(request("https://jis-ask.example.workers.dev/ask", {
  method: "POST", headers: { Origin: "https://elsewhere.example", "Content-Type": "application/json" },
  body: JSON.stringify({ question: "What is JIS?" })
}), env);
assert.equal(response.status, 403);
assert.equal(upstreamCalled, false);

response = await worker.fetch(request("https://jis-ask.example.workers.dev/other", {
  method: "POST", headers: { Origin: site, "Content-Type": "application/json" },
  body: JSON.stringify({ question: "What is JIS?" })
}), env);
assert.equal(response.status, 404);
assert.equal(upstreamCalled, false);

response = await worker.fetch(request("https://jis-ask.example.workers.dev/ask", {
  method: "POST", headers: { Origin: site, "Content-Type": "application/json" },
  body: JSON.stringify({ question: "  What is JIS?  " })
}), env);
assert.equal(response.status, 200);
assert.equal(response.headers.get("Access-Control-Allow-Origin"), site);
assert.deepEqual(await response.json(), { answer: "A wiki-based answer." });
assert.equal(upstreamCalled, true);

upstreamCalled = false;
response = await worker.fetch(request("https://jis-ask.example.workers.dev/ask", {
  method: "POST", headers: { Origin: site, "Content-Type": "application/json" },
  body: JSON.stringify({ question: "x".repeat(2001) })
}), env);
assert.equal(response.status, 400);
assert.equal(upstreamCalled, false);

response = await worker.fetch(request("https://jis-ask.example.workers.dev/ask", {
  method: "POST", headers: { Origin: site, "Content-Type": "application/json" },
  body: JSON.stringify({ question: "What is JIS?" })
}), { ...env, QUESTION_LIMIT: { async limit() { return { success: false }; } } });
assert.equal(response.status, 429);
assert.equal(upstreamCalled, false);

console.log("Worker request boundary tests passed.");
