const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function getCookie(name){
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[-.$?*|{}()\[\]\\\/\+^]/g,'\\$&') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

const state = {
  token: localStorage.getItem('gccs_token') || getCookie('gccs_token') || null,
  me: null,
  charts: { model: null, agent: null }
};

function setMsg(el, msg, kind=''){
  el.textContent = msg || '';
  el.className = 'msg' + (kind ? ' ' + kind : '');
}

async function api(path, { method='GET', body, headers={} } = {}){
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { 'Authorization': `Bearer ${state.token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if(!res.ok){
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function setWhoami(){
  if(!state.me){ $('#whoami').textContent = ''; return; }
  $('#whoami').textContent = `${state.me.email} • ${state.me.role} • scope=${state.me.scopeView}`;
}

function setTabs(active){
  $$('.tab').forEach(btn => btn.classList.toggle('tab--active', btn.dataset.tab === active));
  ['overview','tokens','agents','tasks'].forEach(t => {
    $(`#tab-${t}`).style.display = t === active ? '' : 'none';
  });
}

function toBadgeStatus(status){
  const s = (status || '').toLowerCase();
  if(['ok','online','active','done','completed'].includes(s)) return 'badge badge--ok';
  if(['blocked','error','offline'].includes(s)) return 'badge badge--bad';
  return 'badge';
}

async function loadMe(){
  state.me = await api('/api/auth/me');
  setWhoami();
  $('#scopeHint').textContent = `You can view: ${state.me.scopeView}`;
}

function ensureChartsDestroyed(){
  if(state.charts.model){ state.charts.model.destroy(); state.charts.model = null; }
  if(state.charts.agent){ state.charts.agent.destroy(); state.charts.agent = null; }
}

async function loadOverview(){
  const data = await api('/api/tokens/summary?days=14');
  ensureChartsDestroyed();

  const ctxModel = $('#chartModel');
  state.charts.model = new Chart(ctxModel, {
    type: 'bar',
    data: {
      labels: data.byModel.map(x => x.model),
      datasets: [{ label: 'Total tokens', data: data.byModel.map(x => x.total_tokens) }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  const ctxAgent = $('#chartAgent');
  state.charts.agent = new Chart(ctxAgent, {
    type: 'bar',
    data: {
      labels: data.byAgent.map(x => x.agent),
      datasets: [{ label: 'Total tokens', data: data.byAgent.map(x => x.total_tokens) }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

async function loadTokensTable(){
  const data = await api('/api/tokens/list?days=14');
  const tbody = $('#tokensTable tbody');
  tbody.innerHTML = '';
  for(const r of data.rows){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.day}</td>
      <td>${r.model}</td>
      <td>${r.agent}</td>
      <td><span class="badge">${r.scope}</span></td>
      <td class="num">${r.input_tokens}</td>
      <td class="num">${r.output_tokens}</td>
      <td class="num">${r.total_tokens}</td>
    `;
    tbody.appendChild(tr);
  }
}

async function loadAgentsTable(){
  const data = await api('/api/agents/list');
  const tbody = $('#agentsTable tbody');
  tbody.innerHTML = '';
  for(const a of data.rows){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${a.agent}</td>
      <td><span class="${toBadgeStatus(a.status)}">${a.status}</span></td>
      <td>${a.last_activity_at || ''}</td>
      <td class="muted">${a.details || ''}</td>
    `;
    tbody.appendChild(tr);
  }
}

async function loadTasksTable(){
  const data = await api('/api/tasks/list');
  const tbody = $('#tasksTable tbody');
  tbody.innerHTML = '';

  for(const t of data.rows){
    const tr = document.createElement('tr');
    const canEdit = state.me.role !== 'Stakeholder';
    const statusCell = canEdit
      ? `<select class="select" data-task-id="${t.id}">
          ${['Todo','In Progress','Blocked','Done'].map(s => `<option ${t.status===s?'selected':''}>${s}</option>`).join('')}
        </select>`
      : `<span class="badge">${t.status}</span>`;

    tr.innerHTML = `
      <td>${t.area || ''}</td>
      <td>${t.title}</td>
      <td>${t.owner || ''}</td>
      <td><span class="badge">${t.priority || ''}</span></td>
      <td>${statusCell}</td>
      <td class="muted">${t.source || ''}</td>
      <td class="muted">${t.updated_at || ''}</td>
    `;
    tbody.appendChild(tr);
  }

  if(state.me.role !== 'Stakeholder'){
    $$('#tasksTable select[data-task-id]').forEach(sel => {
      sel.addEventListener('change', async () => {
        try{
          await api('/api/tasks/update', { method:'POST', body: { id: sel.dataset.taskId, status: sel.value } });
          setMsg($('#appMsg'), 'Task updated.', '');
          await loadTasksTable();
        }catch(e){
          setMsg($('#appMsg'), e.message, '');
        }
      });
    });
  }
}

async function init(){
  if(!state.token){ window.location.href = '/login'; return; }

  try{
    await loadMe();
    $('#logoutBtn').style.display = '';
    setTabs('overview');
    await loadOverview();
    await loadTokensTable();
    await loadAgentsTable();
    await loadTasksTable();
  }catch(e){
    localStorage.removeItem('gccs_token');
    window.location.href = '/login';
  }
}

$('#logoutBtn').addEventListener('click', async () => {
  try{ await api('/api/auth/logout', { method:'POST' }); }catch{}
  localStorage.removeItem('gccs_token');
  window.location.href = '/login';
});

$('#refreshTokens').addEventListener('click', async () => {
  try{ await loadTokensTable(); setMsg($('#appMsg'), 'Token data refreshed.'); }
  catch(e){ setMsg($('#appMsg'), e.message); }
});
$('#refreshAgents').addEventListener('click', async () => {
  try{ await loadAgentsTable(); setMsg($('#appMsg'), 'Agent list refreshed.'); }
  catch(e){ setMsg($('#appMsg'), e.message); }
});
$('#refreshTasks').addEventListener('click', async () => {
  try{ await loadTasksTable(); setMsg($('#appMsg'), 'Tasks refreshed.'); }
  catch(e){ setMsg($('#appMsg'), e.message); }
});
$('#syncTasks').addEventListener('click', async () => {
  try{ await api('/api/tasks/sync', { method:'POST' }); await loadTasksTable(); setMsg($('#appMsg'), 'Synced from TRACKER.md.'); }
  catch(e){ setMsg($('#appMsg'), e.message); }
});

$$('.tab').forEach(btn => btn.addEventListener('click', async () => {
  const t = btn.dataset.tab;
  setTabs(t);
  try{
    if(t === 'overview') await loadOverview();
    if(t === 'tokens') await loadTokensTable();
    if(t === 'agents') await loadAgentsTable();
    if(t === 'tasks') await loadTasksTable();
  }catch(e){
    setMsg($('#appMsg'), e.message);
  }
}));

init();
