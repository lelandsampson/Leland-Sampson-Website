# JIS knowledge-base web interface

The public page is `jis.md`. It sends one question to `jis-ask-worker.js` on Cloudflare Workers. The Worker calls Hermes through a **private Workers VPC Service**, using Hermes's bearer key stored as a Worker secret. There is no public Hermes hostname or Docker port mapping.

The site currently uses Hover nameservers, so this setup uses a `workers.dev` Worker URL and leaves the existing DNS and GitHub Pages domain alone. Workers VPC is in open beta; check its availability in your Cloudflare account before starting. No Node frontend build is needed. Wrangler is only a deployment tool for the Worker.

## 1. Hermes HTTP endpoint

Already done on this PC: `API_SERVER_ENABLED=true` and `API_SERVER_HOST=127.0.0.1` are in the mounted `~/.hermes/.env`. The pre-existing 64-character `API_SERVER_KEY` is retained. `platform_toolsets.api_server` in `~/.hermes/config.yaml` is `[file, skills, no_mcp]`, leaving CLI toolsets alone. Hermes was restarted; `GET /health` returned 200, `/v1/models` returned 401 without the key and 200 with it, and one wiki question returned an answer citing `education.md`. `docker inspect` showed **no published ports**.

Keep `API_SERVER_CORS_ORIGINS` unset. Browser requests go only to the Worker. Do not paste `API_SERVER_KEY` or the OpenAI key into the site or this repository.

## 2. Create the private Cloudflare connection

1. Create a Cloudflare account at [dash.cloudflare.com](https://dash.cloudflare.com/) and activate a Workers `workers.dev` subdomain. Record the subdomain. You do **not** need to transfer `sampson.info` DNS.
2. In the [Workers VPC dashboard](https://dash.cloudflare.com/), create a Tunnel named `hermes-jis`. Copy its tunnel token; keep it private. Do not add a public application route.
3. In PowerShell on the Docker PC, run the following first line **by itself**. When PowerShell displays the prompt, paste the **complete `eyJ...` token**, not the Docker command or an abbreviated display, and press Enter. Cloudflare shows the full token under Networking > Tunnels > your tunnel > Add a replica. Then run the remaining lines to save it outside the repository. Confirm the file size is greater than zero before starting `cloudflared`:

   ```powershell
   $token = Read-Host 'Paste the Cloudflare Tunnel token'
   Set-Content -LiteralPath "$HOME\.hermes\cloudflared-token" -Value $token -NoNewline -Encoding ascii
   Remove-Variable token
   (Get-Item -LiteralPath "$HOME\.hermes\cloudflared-token").Length

   docker run -d --name hermes-tunnel --restart unless-stopped `
     --network container:hermes `
     --mount "type=bind,source=$HOME\.hermes\cloudflared-token,target=/run/secrets/tunnel-token,readonly" `
     cloudflare/cloudflared:latest tunnel --no-autoupdate run --token-file /run/secrets/tunnel-token
   docker logs hermes-tunnel
   ```

   The tunnel container can reach Hermes at `127.0.0.1:8642` because it shares Hermes's network namespace. It needs outbound UDP 7844 for Workers VPC's QUIC connection. No inbound firewall rule or `-p` Docker mapping is needed. If you recreate the Hermes container, recreate the tunnel container too.

   If logs report `QUIC connection failed` or `UDP Connectivity` failure, test with Mullvad temporarily disconnected and restart the existing container with `docker restart hermes-tunnel`. Workers VPC requires QUIC over UDP 7844; forcing HTTP/2 over TCP is not a suitable fallback. Mullvad's Windows split tunneling documentation says Docker supports TCP only, so excluding Docker there may not restore this UDP connection.

4. If you installed the Windows cloudflared MSI while troubleshooting, stop and disable its `Cloudflared` Windows service from an administrator PowerShell window. Keep the Docker connector as the only active connector for this tunnel; the Windows service cannot reach Hermes's container-only loopback API.
5. In Workers VPC, create an HTTP VPC Service named `hermes-jis-api` using that Tunnel. Set the service IP to `127.0.0.1` and custom HTTP port to `8642`. Use the tunnel as DNS resolver if the form requires a resolver choice. Record the generated **Service ID**. The service grants access to only that host and port.

## 3. Deploy the Worker

The VPC Service ID is configured in `wrangler.toml`. The Worker is deployed at `https://jis-ask.cls-sampson.workers.dev/ask`, with `HERMES_API_KEY` stored as a Cloudflare secret. A live request without an allowed Origin returned 403; a request from `https://sampson.info` returned a wiki answer citing `education.md`.

For later Worker updates, run `npx wrangler deploy` from this directory. Node is only used for the deployment CLI; the site remains plain HTML and JavaScript. Keep the secret out of `wrangler.toml`, Git, and client JavaScript.

The Worker accepts only `POST /ask`, validates one short question, constructs the Hermes request itself, and returns only answer text. It does not expose Hermes's other API paths, tool calls, secrets, or raw error details. The Worker authenticates to Hermes with the bearer key. The included rate-limit bindings allow five questions per visitor and 100 per Cloudflare location per minute. Cloudflare rate limits are approximate and location-local. Browser-side `Origin` checks and CORS limit normal browser use, but they are **not user authentication**; a script can forge the Origin header. Hermes's `file` and `skills` toolsets still include write-capable tools, so the system prompt is not a security boundary. Keep the bearer key and VPC Service private, and monitor usage. A separate read-only Hermes instance is the stronger option if the interface will receive untrusted or high-volume traffic.

## 4. Connect the GitHub Pages page

1. Commit and push `jis.md`, `_config.yml`, and this `cloudflare` directory to the site's `main` branch. The `cloudflare` directory is excluded from Jekyll's published files; its source can safely be in Git because it contains no secrets.
2. Visit `https://sampson.info/jis` and ask a question that the Markdown files can answer. Confirm that the answer names a source file and that the browser's network panel shows a request to the Worker, never to Hermes or OpenAI.

Sources: [Hermes API server](https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server), [Workers VPC setup](https://developers.cloudflare.com/workers-vpc/get-started/), [VPC Service bindings](https://developers.cloudflare.com/workers-vpc/examples/private-api/), [Cloudflare Tunnel tokens](https://developers.cloudflare.com/tunnel/reference/tunnel-tokens/).
