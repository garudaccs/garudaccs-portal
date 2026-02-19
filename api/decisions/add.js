import { z } from 'zod';
import { json } from '../../lib/auth.js';
import { q } from '../../lib/db.js';
import { withAuth, allowRoles } from '../../lib/middleware.js';

const Body = z.object({
  date: z.string().optional(),
  decision: z.string().min(1),
  context: z.string().optional().nullable(),
  decided_by: z.string().optional().nullable(),
  scope: z.enum(['adhiratha','personal','minervainfo'])
});

function toDateOrNull(s){
  if(!s) return null;
  const m = String(s).match(/^\d{4}-\d{2}-\d{2}$/);
  return m ? s : null;
}

export default withAuth(allowRoles(['Admin','Team'], async function handler(req, res){
  if(req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const parsed = Body.safeParse(JSON.parse(req.body || '{}'));
  if(!parsed.success) return json(res, 400, { error: 'Invalid payload' });

  const b = parsed.data;
  if(req.user.scopeView !== 'all' && b.scope !== req.user.scopeView){
    return json(res, 403, { error: 'Forbidden (scope)' });
  }

  const date = toDateOrNull(b.date) || null;

  const r = await q(
    `insert into decisions(date, decision, context, decided_by, scope)
     values (coalesce($1, now()::date), $2, $3, $4, $5)
     returning id`,
    [date, b.decision, b.context || null, b.decided_by || null, b.scope]
  );

  return json(res, 200, { ok: true, id: r.rows[0].id });
}));
