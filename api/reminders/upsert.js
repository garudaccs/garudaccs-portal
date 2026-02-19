import { z } from 'zod';
import { json } from '../../lib/auth.js';
import { q } from '../../lib/db.js';
import { withAuth, allowRoles } from '../../lib/middleware.js';

const Body = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  title: z.string().min(1),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['P1','P2','P3']).optional(),
  category: z.enum(['personal','work','follow-up']).optional(),
  status: z.enum(['Open','Done']).optional(),
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

  const due = toDateOrNull(b.due_date);
  const created_by = req.user.email;

  if(b.id){
    const id = Number(b.id);
    const scopeGuard = req.user.scopeView === 'all' ? '' : `and scope='${req.user.scopeView}'`;
    const r = await q(
      `update reminders
       set title=$1, due_date=$2, priority=$3, category=$4, status=$5, scope=$6,
           updated_at=now()
       where id=$7 ${scopeGuard}
       returning id`,
      [b.title, due, b.priority || 'P2', b.category || 'work', b.status || 'Open', b.scope, id]
    );
    if(r.rowCount === 0) return json(res, 404, { error: 'Reminder not found (or not permitted)' });
    return json(res, 200, { ok: true, id });
  }

  const r = await q(
    `insert into reminders(title, due_date, priority, category, status, scope, created_by)
     values ($1,$2,$3,$4,$5,$6,$7)
     returning id`,
    [b.title, due, b.priority || 'P2', b.category || 'work', b.status || 'Open', b.scope, created_by]
  );
  return json(res, 200, { ok: true, id: r.rows[0].id });
}));
