import { z } from 'zod';
import { json } from '../lib/auth.js';
import { q } from '../lib/db.js';
import { withAuth, allowRoles } from '../lib/middleware.js';

const Body = z.object({
  date: z.string().optional(),
  decision: z.string().min(1),
  context: z.string().optional().nullable(),
  decided_by: z.string().optional().nullable(),
  scope: z.enum(['adhiratha','personal','minervainfo'])
});

function toDateOrNull(s){
  if(!s) return null;
  return String(s).match(/^\d{4}-\d{2}-\d{2}$/) ? s : null;
}

async function listHandler(req, res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const qStr = (url.searchParams.get('q') || '').trim().slice(0, 200);
  const params = [], where = [];
  if(req.user.scopeView !== 'all'){ params.push(req.user.scopeView); where.push(`scope=$${params.length}`); }
  if(qStr){ params.push('%'+qStr+'%'); where.push(`(decision ilike $${params.length} or context ilike $${params.length} or decided_by ilike $${params.length})`); }
  const whereSql = where.length ? ('where ' + where.join(' and ')) : '';
  const r = await q(`select id, scope, to_char(date, 'YYYY-MM-DD') as date, decision, context, decided_by from decisions ${whereSql} order by date desc, id desc limit 500`, params);
  return json(res, 200, { rows: r.rows });
}

async function addHandler(req, res){
  if(req.user.role !== 'Admin' && req.user.role !== 'Team') return json(res, 403, { error: 'Forbidden' });
  const parsed = Body.safeParse(JSON.parse(req.body || '{}'));
  if(!parsed.success) return json(res, 400, { error: 'Invalid payload' });
  const b = parsed.data;
  if(req.user.scopeView !== 'all' && b.scope !== req.user.scopeView) return json(res, 403, { error: 'Forbidden (scope)' });
  const date = toDateOrNull(b.date) || null;
  const r = await q(`insert into decisions(date, decision, context, decided_by, scope) values (coalesce($1, now()::date), $2, $3, $4, $5) returning id`, [date, b.decision, b.context||null, b.decided_by||null, b.scope]);
  return json(res, 200, { ok: true, id: r.rows[0].id });
}

export default withAuth(async function handler(req, res){
  if(req.method === 'POST') return addHandler(req, res);
  return listHandler(req, res);
});
