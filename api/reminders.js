import { z } from 'zod';
import { json } from '../lib/auth.js';
import { q } from '../lib/db.js';
import { withAuth } from '../lib/middleware.js';

const Body = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  title: z.string().min(1),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['P1','P2','P3']).optional(),
  category: z.enum(['personal','work','follow-up']).optional(),
  status: z.enum(['Open','Done']).optional(),
  scope: z.enum(['adhiratha','personal','minervainfo'])
});

function toDateOrNull(s){ if(!s) return null; return String(s).match(/^\d{4}-\d{2}-\d{2}$/) ? s : null; }

async function listHandler(req, res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const status = (url.searchParams.get('status') || '').trim();
  const params = [], where = [];
  if(req.user.scopeView !== 'all'){ params.push(req.user.scopeView); where.push(`scope=$${params.length}`); }
  if(status){ params.push(status); where.push(`status=$${params.length}`); }
  const whereSql = where.length ? ('where ' + where.join(' and ')) : '';
  const r = await q(`select id, scope, title, to_char(due_date, 'YYYY-MM-DD') as due_date, priority, category, status, to_char(updated_at, 'YYYY-MM-DD HH24:MI') as updated_at, created_by from reminders ${whereSql} order by (case when status='Open' then 0 else 1 end), due_date asc nulls last, id desc limit 500`, params);
  return json(res, 200, { rows: r.rows });
}

async function upsertHandler(req, res){
  if(req.user.role !== 'Admin' && req.user.role !== 'Team') return json(res, 403, { error: 'Forbidden' });
  const parsed = Body.safeParse(JSON.parse(req.body || '{}'));
  if(!parsed.success) return json(res, 400, { error: 'Invalid payload' });
  const b = parsed.data;
  if(req.user.scopeView !== 'all' && b.scope !== req.user.scopeView) return json(res, 403, { error: 'Forbidden (scope)' });
  const due = toDateOrNull(b.due_date);
  if(b.id){
    const id = Number(b.id);
    const scopeGuard = req.user.scopeView === 'all' ? '' : `and scope='${req.user.scopeView}'`;
    const r = await q(`update reminders set title=$1, due_date=$2, priority=$3, category=$4, status=$5, scope=$6, updated_at=now() where id=$7 ${scopeGuard} returning id`, [b.title, due, b.priority||'P2', b.category||'work', b.status||'Open', b.scope, id]);
    if(r.rowCount === 0) return json(res, 404, { error: 'Not found' });
    return json(res, 200, { ok: true, id });
  }
  const r = await q(`insert into reminders(title, due_date, priority, category, status, scope, created_by) values ($1,$2,$3,$4,$5,$6,$7) returning id`, [b.title, due, b.priority||'P2', b.category||'work', b.status||'Open', b.scope, req.user.email]);
  return json(res, 200, { ok: true, id: r.rows[0].id });
}

export default withAuth(async function handler(req, res){
  if(req.method === 'POST') return upsertHandler(req, res);
  return listHandler(req, res);
});
