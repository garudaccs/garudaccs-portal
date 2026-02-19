import { z } from 'zod';
import { json } from '../../lib/auth.js';
import { q } from '../../lib/db.js';
import { withAuth, allowRoles } from '../../lib/middleware.js';

const Body = z.object({
  timestamp: z.string().optional().nullable(),
  from_agent: z.string().optional().nullable(),
  to_agent: z.string().optional().nullable(),
  summary: z.string().min(1),
  scope: z.enum(['adhiratha','personal','minervainfo']),
  message_type: z.string().optional().nullable()
});

export default withAuth(allowRoles(['Admin','Team'], async function handler(req, res){
  if(req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const parsed = Body.safeParse(JSON.parse(req.body || '{}'));
  if(!parsed.success) return json(res, 400, { error: 'Invalid payload' });

  const b = parsed.data;
  if(req.user.scopeView !== 'all' && b.scope !== req.user.scopeView){
    return json(res, 403, { error: 'Forbidden (scope)' });
  }

  const ts = b.timestamp ? new Date(b.timestamp) : new Date();
  if(Number.isNaN(ts.getTime())) return json(res, 400, { error: 'Invalid timestamp' });

  const r = await q(
    `insert into communications(timestamp, from_agent, to_agent, summary, scope, message_type)
     values ($1,$2,$3,$4,$5,$6)
     returning id`,
    [ts.toISOString(), b.from_agent || null, b.to_agent || null, b.summary, b.scope, b.message_type || null]
  );

  return json(res, 200, { ok: true, id: r.rows[0].id });
}));
