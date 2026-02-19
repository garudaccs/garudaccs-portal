import { verifyToken } from '../lib/auth.js';
import { parseCookies } from '../lib/cookies.js';

function html(){
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Garuda CCS — Command & Control Station</title>
  <link rel="stylesheet" href="/public/styles.css" />
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
</head>
<body>
  <header class="topbar">
    <div class="brand">
      <div class="brand__title">Garuda CCS</div>
      <div class="brand__subtitle">Command &amp; Control Station</div>
    </div>
    <div class="topbar__right">
      <div id="whoami" class="muted"></div>
      <button id="logoutBtn" class="btn btn--ghost" style="display:none;">Logout</button>
    </div>
  </header>

  <main class="container">
    <section id="appView">
      <nav class="tabs">
        <button class="tab tab--active" data-tab="overview">Overview</button>
        <button class="tab" data-tab="tokens">Token Usage</button>
        <button class="tab" data-tab="agents">Agents</button>
        <button class="tab" data-tab="tasks">Task Tracker</button>
      </nav>

      <section id="tab-overview" class="card">
        <h2>Overview</h2>
        <div class="grid">
          <div class="panel">
            <h3>Last 14 days — tokens by model</h3>
            <canvas id="chartModel"></canvas>
          </div>
          <div class="panel">
            <h3>Last 14 days — tokens by agent</h3>
            <canvas id="chartAgent"></canvas>
          </div>
        </div>
      </section>

      <section id="tab-tokens" class="card" style="display:none;">
        <h2>Token Usage</h2>
        <div class="row">
          <button id="refreshTokens" class="btn btn--secondary">Refresh</button>
          <span id="scopeHint" class="muted"></span>
        </div>
        <div class="tableWrap">
          <table class="table" id="tokensTable">
            <thead>
              <tr>
                <th>Date</th>
                <th>Model</th>
                <th>Agent</th>
                <th>Scope</th>
                <th class="num">Input</th>
                <th class="num">Output</th>
                <th class="num">Total</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </section>

      <section id="tab-agents" class="card" style="display:none;">
        <h2>Agent Activity</h2>
        <div class="row">
          <button id="refreshAgents" class="btn btn--secondary">Refresh</button>
        </div>
        <div class="tableWrap">
          <table class="table" id="agentsTable">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Status</th>
                <th>Last activity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </section>

      <section id="tab-tasks" class="card" style="display:none;">
        <div class="row">
          <h2 style="margin:0;">Task Tracker</h2>
          <div class="row" style="gap:8px;">
            <button id="syncTasks" class="btn btn--secondary">Sync from TRACKER.md</button>
            <button id="refreshTasks" class="btn btn--secondary">Refresh</button>
          </div>
        </div>
        <p class="muted">Interactive tracker backed by Neon (Postgres). Stakeholders only see Adhiratha scope.</p>
        <div class="tableWrap">
          <table class="table" id="tasksTable">
            <thead>
              <tr>
                <th>Area</th>
                <th>Task</th>
                <th>Owner</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Source</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </section>

      <div id="appMsg" class="msg"></div>
    </section>
  </main>

  <footer class="footer muted">Garuda CCS — Command &amp; Control Station</footer>
  <script type="module" src="/public/app.js"></script>
</body>
</html>`;
}

export default async function handler(req, res){
  try{
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies.gccs_token;
    if(!token){
      res.statusCode = 302;
      res.setHeader('Location', '/login');
      return res.end('Redirecting to /login');
    }
    verifyToken(token);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(html());
  }catch{
    res.statusCode = 302;
    res.setHeader('Location', '/login');
    return res.end('Redirecting to /login');
  }
}
