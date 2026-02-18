import fs from 'node:fs';
import path from 'node:path';
import { json } from '../../lib/auth.js';
import { q } from '../../lib/db.js';
import { withAuth, allowRoles } from '../../lib/middleware.js';

function parseTracker(md){
  const lines = md.split(/\r?\n/);
  const tasks = [];
  let area = '';
  for(const ln of lines){
    const h = ln.match(/^##+\s+(.*)$/);
    if(h){ area = h[1].trim(); continue; }
    const li = ln.match(/^\s*[-*]\s+(.*)$/);
    if(!li) continue;
    const raw = li[1].trim();

    let scope = 'adhiratha';
    const scopeM = raw.match(/\bscope\s*:\s*(adhiratha|personal|minervainfo)\b/i);
    if(scopeM) scope = scopeM[1].toLowerCase();

    let priority = 'P2';
    const pM = raw.match(/\[(P1|P2|P3)\]/i);
    if(pM) priority = pM[1].toUpperCase();

    let owner = null;
    const oM = raw.match(/\bowner\s*:\s*@?([a-z0-9_-]+)\b/i);
    if(oM) owner = oM[1];

    const title = raw
      .replace(/\bscope\s*:\s*(adhiratha|personal|minervainfo)\b/ig,'')
      .replace(/\[(P1|P2|P3)\]/ig,'')
      .replace(/\bowner\s*:\s*@?([a-z0-9_-]+)\b/ig,'')
      .trim();

    if(!title) continue;
    tasks.push({ scope, area, title, owner, priority, status: 'Todo', source: 'TRACKER.md' });
  }
  return tasks;
}

export default withAuth(allowRoles(['Admin','Team'], async function handler(req, res){
  if(req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const trackerPath = path.join(process.cwd(), 'TRACKER.md');
  if(!fs.existsSync(trackerPath)) return json(res, 404, { error: 'TRACKER.md not found in repo' });

  const md = fs.readFileSync(trackerPath, 'utf8');
  const tasks = parseTracker(md);

  let upserted = 0;
  for(const t of tasks){
    if(req.user.scopeView !== 'all' && t.scope !== req.user.scopeView) continue;

    const r = await q(
      `insert into tasks(scope, area, title, owner, priority, status, source)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (scope, area, title) do update
         set owner=excluded.owner, priority=excluded.priority, source=excluded.source
       returning id`,
      [t.scope, t.area, t.title, t.owner, t.priority, t.status, t.source]
    );
    if(r.rowCount) upserted++;
  }

  return json(res, 200, { ok: true, upserted });
}));
