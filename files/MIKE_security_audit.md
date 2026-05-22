# Mike security audit — findings

## What this codebase is
Next.js 16 frontend → Express 4 backend (port 3001) → Supabase Postgres + Auth + Cloudflare R2 (S3-compatible). 

* users upload DOCX/PDF,
* converts them via LibreOffice
* stores in R2
* lets users chat with Claude/Gemini that have document-reading and tracked-changes-editing tools. 

License: AGPL-3.0  GNU Affero General Public License v3.0, a strong copyleft, open-source license designed to ensure software modifications remain open, specifically targeting network-server software.

~150 source files.

## Trust Model

The backend uses Supabase's **service-role key** for every DB call (`backend/src/lib/supabase.ts:1-11`), which bypasses Postgres RLS entirely. RLS (Row-level security) is a common security practice that restricts the conditions where a user can access a given row of a database. The Supabase database layer itself is the largest vulnerability.

---

### 1. RLS is disabled on every table except `user_profiles`, anon key is public

**Where:** `backend/migrations/000_one_shot_schema.sql`. Only `user_profiles` calls `enable row level security` (line 30). Every other table — `projects`, `documents`, `document_versions`, `document_edits`, `chats`, `chat_messages`, `workflows`, `workflow_shares`, `tabular_reviews`, `tabular_cells`, `tabular_review_chats`, `tabular_review_chat_messages`, `project_subfolders`, `hidden_workflows` — has RLS off and there are no `revoke ... from anon` statements anywhere.

In Postges, there are two roles with which a user can interact with the database. The first is anonymously. The ability to do this is defined by an `anon key` Postgres will give to the user. While `anon` is a valid role, it's ability to make changes and read data should be restricted by RLS. As such, an `anon key` is also called a `publishable key`, and is sort of like a URL. Is only used to identify 1. the project you're trying to access, and 2. as an anonymous user. 

Conversely, Postgres also uses a `service_role key` which is like superuser role, allowing a user to access and change all data in the database. The `service_role key`, also called a `secret key` is an actual secret and is treated more like a password. Common ways where this gets leaked are:

* Committing to a git repo by mistake
* Inclusion in error messages 
* Front-end variables that can end up 
* Inclusion elsewhere, like slack or IT tickets

The best practice is for a user to authenticate with the `anon key`, plus a separate web token that verifies who they are. With these pieces of data, PostgREST (the database's HTTP-to-SQL REST API gate) changes an `anon` user to an `authenticated` user. This means that they have the ability to change the rows of the database that they own. This is the design of RLS. 

What Mike does instead is turn off RLS almost entirely, relying on additional identifying tokens to verify who a user is and what permissions they ought to have. This means that an attacker who has an `anon key` is not restricted by any RLS. The danger is unauthorized access and modification by anyone who pulls the `anon key` out of the JS bundle, which can be done by simply loading Mike into a browser.

This would expose every user's:
* chats, 
* chat messages
* document metadata 
* workflows
* workflow prompts
* document annotations
* tabular reviews
* uploaded document filenames

even though the uploaded documents themselves live elsewhere.

---

### 2. `DOWNLOAD_SIGNING_SECRET` falls back to literal `"dev-secret"`

**Where:** `backend/src/lib/downloadTokens.ts:12-18`:

```ts
function getSecret(): string {
    return (
        process.env.DOWNLOAD_SIGNING_SECRET ??
        process.env.SUPABASE_SECRET_KEY ??
        "dev-secret"
    );
}
```

This function `getSecret()` will do one of three things. If there is a `DOWNLOAD_SIGNING_SECRET` in the `.env`, it will return that. If it doens't, then it looks for a defined `SUPABASE_SECRET_KEY` (this is the `service_role key` discussed previously) to return. Without either of those, it will finally return `dev-secret`. 

This is an issue in the context of downloading documents. For context, Mike uses Cloudflare R2/Amazon S3 to interface with cloud storage for uploaded documents. Retrieval of these documents follows a standard URL form:

1. the path of the doc
2. the expiration timeframe for the link
3. a hashed code of both 1 and 2 to show that neither have been altered

Whenever a link to a document is requested from the R2/S3, they have an expiration baked into that hashed code. However, this means that if you have a chat session with Mike with a link to the doc, the link will not longer be good after a specified period of time. This also means that by itself, if someone is removed from an organization, if they still have a valid link to a document, they can still access it. 

To "fix" this, Mike sticks itself in the middle. When a user requests a document, they present two things: a web token proving who they are (JWT), as well as a URL token that Mike gives the user. This token does two things. First, it encodes the path to the file requested by the user. Second, it verifies to Mike that this was actually a URL issued by Mike. These two pieces of information are placed together and placed into the URL.

Even though this URL token uses a standard cryptographic construction (HMAC-SHA256), Mike falls back to weak key to generate that URL token. This is where `getSecret()` comes into play. If environmental variables are not set, it returns just a literal string of the `dev-secret`. This means that anyone who knows the `dev-secret` can forge a valid token for any path with just the information about the filepath and the known secret. This produces links that are the same as what Mike would produce to give access to a given document to the user. 

Mike will still check to see if the user has a valid session token as well as a whether that user is allowed to access that file. This means that while users can generate working URLs, they cannot access files they could not legitimately get through Mike itself. However, the ability to forge these tokens alone is an issue. The design of multi-layer security is that one layer can fail without compromising other layers. This is important especially for systems where layers can be changed and developed at different times. This compromised layer means that if another layer gets a bug, that bug could cascade to create a bigger issue. Furthermore, the fallback from the stronger environmental variables to a literal `dev-secret` happens silently. Additionally, if an attacker knows the secret key, they can probe to see what documents exist, even if they can't access it, since they can probe paths and look at the responses.

This vulnerability also interacts with the fact that RLS is turned off. Since RLS is off, an attacker with just an `anon` key can find the paths to all documents in the Postgres database, and with the `dev-secret`, they can forge a token to access it.

Furthermore, the use of the Supabase `service_role key` as a secret key for making the token is also an issue because changing it would invalidate a whole category of generated URLs to documents that are no longer valid because the key has been changed. Given that these keys are often changed because of a security leak or for routine hygiene, this could be a big issue that Mike tries to avoid by having that middle step in the first place. 

Lastly, the standard practice of handing access keys in software design is to confine a single key to a single purpose, so if a key is compromised, it doesn't cascade into other areas of the software structure. This design violates that principle.

---

### 3. Frontend `getUserIdFromRequest` has a silent-bypass dev fallback

**Where:** `frontend/src/lib/supabase-server.ts:27-30`:

```ts
if (!supabaseUrl || !serviceKey) {
    // Dev fallback — accept raw token as user ID
    return token;
}
```
This function is part of the front end, and its role is to take an incoming HTTP request, verify who the user is from the JWT in the request header, and return the the user's unique ID (`UUID`) if it checks out against Supabase's users. However, if Supabase URL or the `service_role key` are removed from the environmental variables, this code block will return the raw bearer token if it is given the Supabase URL or the `service_role key`, treating any identity its given as a verified identity. The dev probably wrote it this way to make local development easier. 

But this means that an attacker who can discover or guess a user's ID can use this workaround to pretend to be that user because of this function's behavior inside the front end. 

Note that this code is currently not active- nothing calls to it, but could easily become active, and might even accidentally become active during further development. 

---

### 4. Raw Claude stream logs persist plaintext chats to disk on the backend

**Where:** `backend/src/lib/llm/claude.ts:13-16, 83-87`:

```ts
const RAW_STREAM_LOG_PATH = path.resolve(process.cwd(), "claude-raw-stream.log");
...
stream.on("streamEvent", (event) => {
    const line = JSON.stringify(event);
    console.log("[claude raw stream]", line);
    fs.appendFile(RAW_STREAM_LOG_PATH, line + "\n", () => {});
});
```

To interface with Claude, Mike streams the chat session with Claude and displays them to the user. This includes everything that Claude returns, such as messages, doc text being read, tool calls, and assistant outputs. All of this is written to a single file on the local disk with no rotation or size cap. This file has no encryption, monitoring, alerts, automated cleanup, or rotation.

On one hand, this is just a growing file that eventually will outgrow the available storage given enough use. This alone is a pretty significant issue. 

Additionally, given the confidential nature of legal information, this is a significant vulnerability. This means that anyone who gets access to a local disc can pull this file and have a log of everything a user has worked on. 

---

### 5. User-supplied LLM API keys stored in plaintext

**Where:** `user_profiles.claude_api_key`, `user_profiles.gemini_api_key` (`backend/migrations/000_one_shot_schema.sql:21-22`), read in `backend/src/lib/userSettings.ts:32-39`.

Mike allows users to plug in their own API keys for Claude/Gemini. These are stored in plain text in Postgres. The backend also reads these keys on every single chat request. 

Luckily, user-profiles is the only table with RLS protection, so it can't be accessed with the `anon key` exploit. However, this does leave an attack surface open for anyone who can access the Supabase/Postgres database, any backups of those databases, or logs/errors that may emit the keys. This is also vulnerable to anyone who might discover the `service-role key`, vulnerabilities in the user's browser, and future backend bugs.

---

### 6. `GET /projects/:projectId/people` enumerates every user in the Supabase project

**Where:** `backend/src/routes/projects.ts:172` (and the same pattern at `routes/workflows.ts:117`):

```ts
const { data: usersData } = await db.auth.admin.listUsers({ perPage: 1000 });
```

When trying to validate which emails are associated with which user records, Mike uses the Postgres `auth.users` table that holds this information. The most intuitive way to do this would be to do a targeted lookup with Postgres itself. This is literally one of the most performant aspects of using a relational database like Postgres. Instead of doing this, Mike enumerates every user in the entire Supabase project (up to 1000 users) into its RAM, then looks through them all itself to find the rows that are relevant. This means Mike loads a tremendous amount of information into RAM just to throw most of it away.

This also means that users past 1000 also can't be found by this method. This is a silent issue that fails without any outward indication. Considering the nature of Mike as an open source clone of Harvey, this likely won't be an issue, but presents a major scale issue.

Note that this isn't a bigger issue because all of this is happening on Mike's server, and is not shared on the user.

The best practice is data minimization- only access the data that you need. The fact that Mike moves basically all users into its memory could be catastrophic if future changes ever change where that information can be accessed to transferred.

---

# Other issues from Claude:
7. Validation gaps on `shared_with` and `workflow_shares.shared_with_email`
8. LibreOffice converter has no timeout, resource limit, or concurrency cap
9. Zip-slip via user-controlled filenames in `download-zip`
10. Inconsistent email-comparison normalization
11. No standard hardening middleware
12. CORS allows credentials
13. Prompt-injection blast radius is bounded but not zero
14. Account deletion has no confirmation step
15. Filename truncation but no display-name sanitization
16. `multer` multer 1.x has been deprecated in favor of 2.x. CVE-2025-7338 (DoS) affects 1.x.