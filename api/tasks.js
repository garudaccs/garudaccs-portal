import { z } from 'zod';
import { json } from '../lib/auth.js';
import { q } from '../lib/db.js';
import { withAuth } from '../lib/middleware.js';

function clampStr(s, n=80){ return (s || '').toString().slice(0, n); }
function toDateOrNull(s){ if(!s) return null; return String(s).match(/^\d{4}-\d{2}-\d{2}$/) ? s : null; }

const UpsertBody = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  scope: z.enum(['adhiratha','personal','minervainfo']),
  area: z.string().optional().nullable(),
  title: z.string().min(1),
  owner: z.string().optional().nullable(),
  priority: z.enum(['P1','P2','P3']).optional().nullable(),
  status: z.enum(['Todo','In Progress','Blocked','Done']).optional(),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
});

const UpdateBody = z.object({
  id: z.union([z.string(), z.number()]),
  status: z.enum(['Todo','In Progress','Blocked','Done'])
});

async function listHandler(req, res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const scope = clampStr(url.searchParams.get('scope'));
  const owner = clampStr(url.searchParams.get('owner'));
  const priority = clampStr(url.searchParams.get('priority'));
  const status = clampStr(url.searchParams.get('status'));
  const where = [], params = [];
  if(req.user.scopeView !== 'all'){ params.push(req.user.scopeView); where.push(`scope=$${params.length}`); }
  else if(scope){ params.push(scope); where.push(`scope=$${params.length}`); }
  if(owner){ params.push(owner); where.push(`owner=$${params.length}`); }
  if(priority){ params.push(priority); where.push(`priority=$${params.length}`); }
  if(status){ params.push(status); where.push(`status=$${params.length}`); }
  const whereSql = where.length ? ('where ' + where.join(' and ')) : '';
  const r = await q(`select id, scope, area, title, owner, priority, status, source, to_char(start_date,'YYYY-MM-DD') as start_date, to_char(due_date,'YYYY-MM-DD') as due_date, to_char(completed_at,'YYYY-MM-DD HH24:MI') as completed_at, to_char(updated_at,'YYYY-MM-DD HH24:MI') as updated_at from tasks ${whereSql} order by (case when status='Blocked' then 0 when status='In Progress' then 1 when status='Todo' then 2 else 3 end), priority asc nulls last, id desc limit 1000`, params);
  return json(res, 200, { rows: r.rows });
}

async function postHandler(req, res){
  if(req.user.role !== 'Admin' && req.user.role !== 'Team') return json(res, 403, { error: 'Forbidden' });
  const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}));
  // Quick status update (has id+status only, no title)
  if(body.id && body.status && !body.title){
    const parsed = UpdateBody.safeParse(body);
    if(!parsed.success) return json(res, 400, { error: 'Invalid payload' });
    const id = Number(parsed.data.id);
    const scopeGuard = req.user.scopeView === 'all' ? '' : `and scope='${req.user.scopeView}'`;
    const r = await q(`update tasks set status=$1, completed_at=case when $1='Done' then coalesce(completed_at,now()) else null end, updated_at=now() where id=$2 ${scopeGuard} returning id`, [parsed.data.status, id]);
    if(r.rowCount === 0) return json(res, 404, { error: 'Not found' });
    return json(res, 200, { ok: true });
  }
  // Full upsert
  const parsed = UpsertBody.safeParse(body);
  if(!parsed.success) return json(res, 400, { error: 'Invalid payload' });
  const b = parsed.data;
  if(req.user.scopeView !== 'all' && b.scope !== req.user.scopeView) return json(res, 403, { error: 'Forbidden (scope)' });
  const sd = toDateOrNull(b.start_date), dd = toDateOrNull(b.due_date);
  if(b.id){
    const id = Number(b.id);
    const scopeGuard = req.user.scopeView === 'all' ? '' : `and scope='${req.user.scopeView}'`;
    const r = await q(`update tasks set scope=$1, area=$2, title=$3, owner=$4, priority=$5, status=$6, start_date=$7, due_date=$8, completed_at=case when $6='Done' then coalesce(completed_at,now()) else null end, updated_at=now() where id=$9 ${scopeGuard} returning id`, [b.scope, b.area||null, b.title, b.owner||null, b.priority||null, b.status||'Todo', sd, dd, id]);
    if(r.rowCount === 0) return json(res, 404, { error: 'Not found' });
    return json(res, 200, { ok: true, id });
  }
  const r = await q(`insert into tasks(scope, area, title, owner, priority, status, start_date, due_date, source) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`, [b.scope, b.area||null, b.title, b.owner||null, b.priority||null, b.status||'Todo', sd, dd, 'UI']);
  return json(res, 200, { ok: true, id: r.rows[0].id });
}

export default withAuth(async function handler(req, res){
  if(req.method === 'POST') return postHandler(req, res);
  return listHandler(req, res);
});
