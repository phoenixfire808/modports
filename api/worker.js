const TERMS_VERSION = "rustports-2026-09-30-v2";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_SECONDS = 60 * 10;
const BODY_LIMIT = 8 * 1024;
const PROJECT_LIMIT_PER_DAY = 5;
const CATEGORIES = new Set(["survival", "parody", "sandbox", "adventure", "other"]);
const STAGES = new Set(["prototype", "playable", "released"]);
const MODERATOR_STATUSES = new Set(["under_review", "changes_requested", "approved", "published", "rejected", "removed"]);

function siteOrigin(env) {
  return (env.SITE_ORIGIN || "https://rustports.com").replace(/\/$/, "");
}
function githubClientSecret(env) {
  return env.GITHUB_CLIENT_SECRET || env.RustGitHub;
}
function isRustPortsHost(host) {
  return host === "rustports.com" || host.endsWith(".rustports.com");
}
function cookieDomain(url) {
  return isRustPortsHost(url.hostname) ? "; Domain=.rustports.com" : "";
}
function cookie(name, value, url, { httpOnly = true, maxAge = SESSION_SECONDS, path = "/" } = {}) {
  const secure = url.protocol === "https:" ? "; Secure" : "";
  const http = httpOnly ? "; HttpOnly" : "";
  return `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; SameSite=Lax${secure}${http}${cookieDomain(url)}`;
}
function clearCookie(name, url, { httpOnly = true, path = "/" } = {}) {
  return cookie(name, "", url, { httpOnly, maxAge: 0, path });
}
function cookies(request) {
  const jar = {};
  for (const item of (request.headers.get("Cookie") || "").split(";")) {
    const i = item.indexOf("=");
    if (i < 0) continue;
    try { jar[item.slice(0, i).trim()] = decodeURIComponent(item.slice(i + 1).trim()); } catch { /* ignore malformed cookies */ }
  }
  return jar;
}
function equalText(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const aa = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  let diff = aa.length ^ bb.length;
  const length = Math.max(aa.length, bb.length);
  for (let i = 0; i < length; i++) diff |= (aa[i % Math.max(aa.length, 1)] || 0) ^ (bb[i % Math.max(bb.length, 1)] || 0);
  return diff === 0;
}
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
function randomToken(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(data, byte => byte.toString(16).padStart(2, "0")).join("");
}
function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function challenge(verifier) {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}
function json(request, env, body, status = 200, extra = {}) {
  const origin = request.headers.get("Origin");
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
  });
  if (origin && origin === siteOrigin(env)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token");
  }
  for (const [key, value] of Object.entries(extra)) {
    if (key.toLowerCase() === "set-cookie" && Array.isArray(value)) {
      for (const cookieHeader of value) headers.append("Set-Cookie", cookieHeader);
    } else {
      headers.append(key, String(value));
    }
  }
  return new Response(JSON.stringify(body), { status, headers });
}
function redirect(url, extraHeaders = {}) {
  const headers = new Headers({ Location: url, "Cache-Control": "no-store" });
  for (const [key, value] of Object.entries(extraHeaders)) {
    if (key === "setCookies") {
      for (const cookieHeader of value) headers.append("Set-Cookie", cookieHeader);
    } else {
      headers.set(key, String(value));
    }
  }
  return new Response(null, { status: 302, headers });
}
function err(request, env, status, message) {
  return json(request, env, { error: message }, status);
}
function exactOrigin(request, env) {
  return request.headers.get("Origin") === siteOrigin(env);
}
async function bodyJson(request) {
  const type = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") return { error: "This endpoint accepts JSON text only. File uploads are not accepted." };
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > BODY_LIMIT) return { error: "Request is too large. RustPorts accepts metadata only." };
  const reader = request.body?.getReader();
  if (!reader) return { data: {} };
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > BODY_LIMIT) { await reader.cancel(); return { error: "Request is too large. RustPorts accepts metadata only." }; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return { data: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) }; }
  catch { return { error: "Invalid JSON body." }; }
}
function cleanText(value, max, field) {
  if (typeof value !== "string") return { error: `${field} is required.` };
  const text = value.trim();
  if (!text || text.length > max) return { error: `${field} must be 1-${max} characters.` };
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) return { error: `${field} contains unsupported control characters.` };
  return { value: text };
}
function parseRepoUrl(input) {
  if (typeof input !== "string" || input.length > 250) return null;
  let url;
  try { url = new URL(input.trim()); } catch { return null; }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || url.port || url.username || url.password || url.search || url.hash) return null;
  const match = url.pathname.match(/^\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9_.-]{1,100})\/?$/);
  if (!match || match[2] === "." || match[2] === ".." || match[2].endsWith(".git")) return null;
  return { owner: match[1], name: match[2], url: `https://github.com/${match[1]}/${match[2]}` };
}
async function publicRepo(owner, name) {
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const response = await fetch(endpoint, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "RustPorts-community-index" },
    redirect: "manual",
  });
  if (response.status !== 200) return null;
  const repo = await response.json();
  if (repo.private !== false || repo.disabled === true || !repo.owner || typeof repo.owner.login !== "string") return null;
  return { ownerLogin: repo.owner.login, ownerId: Number(repo.owner.id), ownerType: repo.owner.type, name: repo.name };
}
async function getSession(request, env) {
  const token = cookies(request).rp_session;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(`SELECT s.csrf_hash, s.expires_at, u.github_id, u.github_login
    FROM sessions s JOIN users u ON u.github_id=s.github_id WHERE s.token_hash=?1`).bind(tokenHash).first();
  if (!row || row.expires_at <= new Date().toISOString()) {
    if (row) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?1").bind(tokenHash).run();
    return null;
  }
  const moderatorIds = (env.MODERATOR_GITHUB_IDS || "").split(",").map(x => x.trim()).filter(Boolean);
  return { tokenHash, csrfHash: row.csrf_hash, githubId: Number(row.github_id), login: row.github_login, isModerator: moderatorIds.includes(String(row.github_id)) };
}
async function requireCsrf(request, env, user) {
  const header = request.headers.get("X-CSRF-Token") || "";
  const jar = cookies(request);
  const cookieValue = jar.rp_csrf || "";
  if (!equalText(header, cookieValue) || !equalText(await sha256(header), user.csrfHash)) return false;
  return exactOrigin(request, env);
}
async function requireSession(request, env) {
  const user = await getSession(request, env);
  return user ? { user } : { response: err(request, env, 401, "Sign in with GitHub to continue.") };
}
async function authStart(request, env, url) {
  if (request.method !== "POST") return err(request, env, 405, "Use the sign-in form.");
  if (!exactOrigin(request, env)) return err(request, env, 403, "Invalid origin.");
  if (!env.GITHUB_CLIENT_ID || !githubClientSecret(env)) return err(request, env, 503, "GitHub sign-in is not configured yet.");
  const type = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  if (type !== "application/x-www-form-urlencoded") return err(request, env, 415, "Expected the account terms form.");
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 2048) return err(request, env, 413, "Request is too large.");
  const form = await request.formData();
  if (form.get("termsAccepted") !== "yes" || form.get("termsVersion") !== TERMS_VERSION) return err(request, env, 400, "Accept the current Terms of Service before creating or accessing an account.");
  const state = randomToken();
  const verifier = randomToken(48);
  const now = new Date();
  const acceptedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + OAUTH_SECONDS * 1000).toISOString();
  await env.DB.prepare("INSERT INTO oauth_attempts (state_hash, code_verifier, terms_version, accepted_at, expires_at) VALUES (?1,?2,?3,?4,?5)")
    .bind(await sha256(state), verifier, TERMS_VERSION, acceptedAt, expiresAt).run();
  const auth = new URL("https://github.com/login/oauth/authorize");
  auth.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  auth.searchParams.set("redirect_uri", env.GITHUB_CALLBACK_URL || "https://api.rustports.com/auth/github/callback");
  auth.searchParams.set("scope", "read:user");
  auth.searchParams.set("state", state);
  auth.searchParams.set("code_challenge", await challenge(verifier));
  auth.searchParams.set("code_challenge_method", "S256");
  return redirect(auth.toString(), { setCookies: [cookie("rp_oauth_state", state, url, { maxAge: OAUTH_SECONDS, path: "/auth" })] });
}
async function authCallback(request, env, url) {
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  const jar = cookies(request);
  if (!/^[a-f0-9]{64}$/.test(state) || !code || code.length > 512 || !equalText(state, jar.rp_oauth_state || "")) return redirect(`${siteOrigin(env)}/?auth=failed`, { setCookies: [clearCookie("rp_oauth_state", url, { path: "/auth" })] });
  const stateHash = await sha256(state);
  const attempt = await env.DB.prepare("SELECT * FROM oauth_attempts WHERE state_hash=?1").bind(stateHash).first();
  await env.DB.prepare("DELETE FROM oauth_attempts WHERE state_hash=?1").bind(stateHash).run();
  if (!attempt || attempt.expires_at <= new Date().toISOString() || attempt.terms_version !== TERMS_VERSION) return redirect(`${siteOrigin(env)}/?auth=expired`, { setCookies: [clearCookie("rp_oauth_state", url, { path: "/auth" })] });

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "RustPorts-community-index" },
    body: new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, client_secret: githubClientSecret(env), code, redirect_uri: env.GITHUB_CALLBACK_URL || "https://api.rustports.com/auth/github/callback", code_verifier: attempt.code_verifier }),
  });
  if (!tokenResponse.ok) return redirect(`${siteOrigin(env)}/?auth=failed`, { setCookies: [clearCookie("rp_oauth_state", url, { path: "/auth" })] });
  const tokenData = await tokenResponse.json();
  if (typeof tokenData.access_token !== "string" || tokenData.scope && !tokenData.scope.split(",").includes("read:user")) return redirect(`${siteOrigin(env)}/?auth=failed`, { setCookies: [clearCookie("rp_oauth_state", url, { path: "/auth" })] });

  const profileResponse = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "RustPorts-community-index" },
    redirect: "error",
  });
  if (!profileResponse.ok) return redirect(`${siteOrigin(env)}/?auth=failed`, { setCookies: [clearCookie("rp_oauth_state", url, { path: "/auth" })] });
  const profile = await profileResponse.json();
  if (!Number.isSafeInteger(profile.id) || profile.id <= 0 || typeof profile.login !== "string" || profile.login.length > 39) return redirect(`${siteOrigin(env)}/?auth=failed`, { setCookies: [clearCookie("rp_oauth_state", url, { path: "/auth" })] });

  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO users (github_id, github_login, created_at, updated_at) VALUES (?1,?2,?3,?3)
    ON CONFLICT(github_id) DO UPDATE SET github_login=excluded.github_login, updated_at=excluded.updated_at`)
    .bind(profile.id, profile.login, now).run();
  await env.DB.prepare("INSERT OR IGNORE INTO terms_acceptances (github_id, terms_version, accepted_at) VALUES (?1,?2,?3)")
    .bind(profile.id, attempt.terms_version, attempt.accepted_at).run();
  const sessionToken = randomToken();
  const csrfToken = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token_hash, csrf_hash, github_id, created_at, expires_at) VALUES (?1,?2,?3,?4,?5)")
    .bind(await sha256(sessionToken), await sha256(csrfToken), profile.id, now, expiresAt).run();

  const clearState = clearCookie("rp_oauth_state", url, { path: "/auth" });
  const sessionCookie = cookie("rp_session", sessionToken, url, { maxAge: SESSION_SECONDS });
  const csrfCookie = cookie("rp_csrf", csrfToken, url, { httpOnly: false, maxAge: SESSION_SECONDS });
  return redirect(`${siteOrigin(env)}/?auth=success`, { setCookies: [clearState, sessionCookie, csrfCookie] });
}
function apiJson(request, env, body, status = 200, headers = {}) {
  const response = json(request, env, body, status, headers);
  return response;
}
async function apiRoute(request, env, url) {
  if (request.method === "OPTIONS") {
    const origin = request.headers.get("Origin");
    if (origin !== siteOrigin(env)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    } });
  }
  if (request.method === "GET" && url.pathname === "/api/catalog") {
    const result = await env.DB.prepare(`SELECT p.id, p.name, p.summary, p.category, p.development_stage, p.repo_url, p.repo_owner, p.repo_name, p.repo_owner_verified, p.published_at,
      u.github_login AS creator, COUNT(s.github_id) AS picks
      FROM projects p JOIN users u ON u.github_id=p.github_id LEFT JOIN selections s ON s.project_id=p.id
      WHERE p.status='published' GROUP BY p.id ORDER BY p.published_at DESC LIMIT 200`).all();
    return apiJson(request, env, { projects: result.results || [] });
  }
  if (request.method === "GET" && url.pathname === "/api/activity") {
    const result = await env.DB.prepare(`SELECT p.id, p.name AS project, s.created_at
      FROM selections s JOIN projects p ON p.id=s.project_id WHERE p.status='published'
      ORDER BY s.created_at DESC LIMIT 15`).all();
    return apiJson(request, env, { activity: (result.results || []).map(row => ({ projectId: row.id, project: row.project, time: row.created_at })) });
  }
  if (request.method === "GET" && url.pathname === "/api/me") {
    const user = await getSession(request, env);
    if (!user) return apiJson(request, env, { user: null });
    const [acceptance, projects] = await Promise.all([
      env.DB.prepare("SELECT terms_version, accepted_at FROM terms_acceptances WHERE github_id=?1 ORDER BY accepted_at DESC LIMIT 1").bind(user.githubId).first(),
      env.DB.prepare("SELECT id, name, status, status_reason, repo_url, development_stage, created_at, updated_at FROM projects WHERE github_id=?1 ORDER BY updated_at DESC LIMIT 100").bind(user.githubId).all(),
    ]);
    const owns = await env.DB.prepare("SELECT project_id FROM selections WHERE github_id=?1").bind(user.githubId).all();
    return apiJson(request, env, { user: { githubId: user.githubId, login: user.login, isModerator: user.isModerator, terms: acceptance || null }, projects: projects.results || [], picks: (owns.results || []).map(row => row.project_id) });
  }
  if (request.method === "POST" && url.pathname === "/api/logout") {
    const auth = await requireSession(request, env);
    if (auth.response) return auth.response;
    if (!(await requireCsrf(request, env, auth.user))) return err(request, env, 403, "Request could not be verified.");
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?1").bind(auth.user.tokenHash).run();
    return apiJson(request, env, { ok: true }, 200, {
      "Set-Cookie": [clearCookie("rp_session", url), clearCookie("rp_csrf", url, { httpOnly: false })],
    });
  }
  if (request.method === "POST" && url.pathname === "/api/projects") {
    const auth = await requireSession(request, env);
    if (auth.response) return auth.response;
    if (!(await requireCsrf(request, env, auth.user))) return err(request, env, 403, "Request could not be verified.");
    const parsed = await bodyJson(request);
    if (parsed.error) return err(request, env, 400, parsed.error);
    const data = parsed.data;
    if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).some(key => !["name", "summary", "category", "developmentStage", "repositoryUrl", "noAssetsAttested"].includes(key))) return err(request, env, 400, "Only project metadata and a public GitHub repository URL are accepted. Files and assets are never accepted.");
    if (data.noAssetsAttested !== true) return err(request, env, 400, "Confirm that you are submitting no files or assets.");
    const name = cleanText(data.name, 70, "Project name");
    const summary = cleanText(data.summary, 500, "Description");
    if (name.error) return err(request, env, 400, name.error);
    if (summary.error) return err(request, env, 400, summary.error);
    if (!CATEGORIES.has(data.category)) return err(request, env, 400, "Choose a valid project category.");
    if (!STAGES.has(data.developmentStage)) return err(request, env, 400, "Choose a valid project stage.");
    const repo = parseRepoUrl(data.repositoryUrl);
    if (!repo) return err(request, env, 400, "Link one public GitHub repository in the form https://github.com/owner/repository. No files or assets can be attached.");
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = await env.DB.prepare("SELECT COUNT(*) AS count FROM projects WHERE github_id=?1 AND created_at>?2").bind(auth.user.githubId, yesterday).first();
    if (Number(recent?.count || 0) >= PROJECT_LIMIT_PER_DAY) return err(request, env, 429, "Submission limit reached. Try again later.");
    let metadata;
    try { metadata = await publicRepo(repo.owner, repo.name); }
    catch { return err(request, env, 502, "GitHub could not verify that public repository right now."); }
    if (!metadata || metadata.ownerLogin.toLowerCase() !== repo.owner.toLowerCase() || metadata.name.toLowerCase() !== repo.name.toLowerCase()) return err(request, env, 400, "That public GitHub repository could not be verified. Check the URL and visibility.");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const ownerVerified = metadata.ownerType === "User" && metadata.ownerId === auth.user.githubId ? 1 : 0;
    await env.DB.prepare(`INSERT INTO projects (id, github_id, name, summary, category, development_stage, repo_url, repo_owner, repo_name, repo_owner_verified, status, status_reason, created_at, updated_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,'submitted','Waiting for moderator review.',?11,?11)`)
      .bind(id, auth.user.githubId, name.value, summary.value, data.category, data.developmentStage, repo.url, metadata.ownerLogin, metadata.name, ownerVerified, now).run();
    return apiJson(request, env, { project: { id, name: name.value, status: "submitted", statusReason: "Waiting for moderator review.", repositoryUrl: repo.url, ownerVerified: Boolean(ownerVerified) } }, 201);
  }
  const pickMatch = url.pathname.match(/^\/api\/projects\/([0-9a-f-]{36})\/pick$/i);
  if (pickMatch && ["POST", "DELETE"].includes(request.method)) {
    if (request.body !== null) return err(request, env, 415, "This endpoint does not accept a request body or files.");
    const auth = await requireSession(request, env);
    if (auth.response) return auth.response;
    if (!(await requireCsrf(request, env, auth.user))) return err(request, env, 403, "Request could not be verified.");
    const project = await env.DB.prepare("SELECT id FROM projects WHERE id=?1 AND status='published'").bind(pickMatch[1]).first();
    if (!project) return err(request, env, 404, "Project not found.");
    if (request.method === "POST") await env.DB.prepare("INSERT OR IGNORE INTO selections (github_id, project_id, created_at) VALUES (?1,?2,?3)").bind(auth.user.githubId, project.id, new Date().toISOString()).run();
    else await env.DB.prepare("DELETE FROM selections WHERE github_id=?1 AND project_id=?2").bind(auth.user.githubId, project.id).run();
    const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM selections WHERE project_id=?1").bind(project.id).first();
    return apiJson(request, env, { selected: request.method === "POST", picks: Number(count?.count || 0) });
  }
  if (request.method === "GET" && url.pathname === "/api/mod/queue") {
    const auth = await requireSession(request, env);
    if (auth.response) return auth.response;
    if (!auth.user.isModerator) return err(request, env, 403, "Moderator access is required.");
    const result = await env.DB.prepare(`SELECT p.*, u.github_login AS creator FROM projects p JOIN users u ON u.github_id=p.github_id
      WHERE p.status!='removed' ORDER BY CASE p.status WHEN 'submitted' THEN 0 WHEN 'under_review' THEN 1 ELSE 2 END, p.created_at ASC LIMIT 200`).all();
    return apiJson(request, env, { projects: result.results || [] });
  }
  const moderationMatch = url.pathname.match(/^\/api\/mod\/projects\/([0-9a-f-]{36})\/status$/i);
  if (request.method === "POST" && moderationMatch) {
    const auth = await requireSession(request, env);
    if (auth.response) return auth.response;
    if (!auth.user.isModerator) return err(request, env, 403, "Moderator access is required.");
    if (!(await requireCsrf(request, env, auth.user))) return err(request, env, 403, "Request could not be verified.");
    const parsed = await bodyJson(request);
    if (parsed.error) return err(request, env, 400, parsed.error);
    const { status, reason, assetsReviewed } = parsed.data || {};
    if (!MODERATOR_STATUSES.has(status)) return err(request, env, 400, "Choose a valid moderation status.");
    const didAssetReview = assetsReviewed === true;
    if (["approved", "published"].includes(status) && !didAssetReview) return err(request, env, 400, "Before approval, confirm you manually reviewed the public GitHub project page and found no copied source-game or third-party assets.");
    const cleanReason = cleanText(reason, 500, "Moderation note");
    if (cleanReason.error) return err(request, env, 400, cleanReason.error);
    const project = await env.DB.prepare("SELECT id, status FROM projects WHERE id=?1").bind(moderationMatch[1]).first();
    if (!project) return err(request, env, 404, "Project not found.");
    const allowed = {
      submitted: ["under_review", "changes_requested", "rejected"],
      under_review: ["changes_requested", "approved", "rejected"],
      changes_requested: ["under_review", "rejected"],
      approved: ["published", "changes_requested", "removed"],
      published: ["changes_requested", "removed"],
      rejected: ["removed"],
      removed: [],
    };
    if (!allowed[project.status]?.includes(status)) return err(request, env, 409, `Cannot change ${project.status} to ${status}.`);
    const now = new Date().toISOString();
    const batch = [
      env.DB.prepare("UPDATE projects SET status=?1, status_reason=?2, updated_at=?3, published_at=CASE WHEN ?1='published' THEN ?3 ELSE NULL END WHERE id=?4").bind(status, cleanReason.value, now, project.id),
      env.DB.prepare("INSERT INTO moderation_events (id, project_id, moderator_github_id, from_status, to_status, reason, created_at, assets_reviewed) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)").bind(crypto.randomUUID(), project.id, auth.user.githubId, project.status, status, cleanReason.value, now, didAssetReview ? 1 : 0),
    ];
    await env.DB.batch(batch);
    return apiJson(request, env, { ok: true, status, reason: cleanReason.value });
  }
  return err(request, env, 404, "Not found.");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/auth/github/start") return await authStart(request, env, url);
      if (url.pathname === "/auth/github/callback" && request.method === "GET") return await authCallback(request, env, url);
      if (url.pathname.startsWith("/api/")) return await apiRoute(request, env, url);
      return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    } catch (error) {
      console.error("RustPorts request failed", { path: url.pathname, name: error?.name || "Error" });
      if (url.pathname.startsWith("/api/")) return err(request, env, 500, "The request could not be completed.");
      return redirect(`${siteOrigin(env)}/?auth=failed`);
    }
  },
};
