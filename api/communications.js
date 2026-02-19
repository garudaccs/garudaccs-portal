import { z } from 'zod';
import { json } from '../lib/auth.js';
import { q } from '../lib/db.js';
import { withAuth, allowRoles } from '../lib/middleware.js';

const Body = z.object({
  timestamp: z.string().optional().nullable(),
  from_agent: z.string().optional().nullable(),
  to_agent: z.string().optional().nullable(),
  summary: z.string().min(1),
  scope: z.enum(['adhiratha','personal','minervainfo']),
  message_type: z.string().optional().nullable()
});

async function listHandler(req, res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const agent = (url.searchParams.get('agent') || '').trim().slice(0, 80);
  const params = [], where = [];
  if(req.user.scopeView !== 'all'){ params.push(req.user.scopeView); where.push(`scope=$${params.length}`); }
  if(agent){ params.push(agent); where.push(`(from_agent=$${params.length} or to_agent=$${params.length})`); }
  const whereSql = where.length ? ('where ' + where.join(' and ')) : '';
  const r = await q(`select id, scope, to_char(timestamp, 'YYYY-MM-DD HH24:MI') as timestamp, from_agent, to_agent, message_type, summary from communications ${whereSql} order by timestamp desc, id desc limit 600`, params);
  return json(res, 200, { rows: r.rows });
}

async function addHandler(req, res){
  if(req.user.role !== 'Admin' && req.user.role !== 'Team') return json(res, 403, { error: 'Forbidden' });
  const parsed = Body.safeParse((typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})));
  if(!parsed.success) return json(res, 400, { error: 'Invalid payload' });
  const b = parsed.data;
  if(req.user.scopeView !== 'all' && b.scope !== req.user.scopeView) return json(res, 403, { error: 'Forbidden (scope)' });
  const ts = b.timestamp ? new Date(b.timestamp) : new Date();
  if(Number.isNaN(ts.getTime())) return json(res, 400, { error: 'Invalid timestamp' });
  const r = await q(`insert into communications(timestamp, from_agent, to_agent, summary, scope, message_type) values ($1,$2,$3,$4,$5,$6) returning id`, [ts.toISOString(), b.from_agent||null, b.to_agent||null, b.summary, b.scope, b.message_type||null]);
  return json(res, 200, { ok: true, id: r.rows[0].id });
}

export default withAuth(async function handler(req, res){
  if(req.method === 'POST') return addHandler(req, res);
  return listHandler(req, res);
});
