import { z } from 'zod';
import { json } from '../../lib/auth.js';
import { q } from '../../lib/db.js';
import { withAuth, allowRoles } from '../../lib/middleware.js';

const Body = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  scope: z.enum(['adhiratha','personal','minervainfo']),
  area: z.string().optional().nullable(),
  title: z.string().min(1),
  owner: z.string().optional().nullable(),
  priority: z.enum(['P1','P2','P3']).optional().nullable(),
  status: z.enum(['Todo','In Progress','Blocked','Done']).optional(),
  start_date: z.string().optional().nullable(), // YYYY-MM-DD
  due_date: z.string().optional().nullable(),
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

  const start_date = toDateOrNull(b.start_date);
  const due_date = toDateOrNull(b.due_date);

  if(b.id){
    const id = Number(b.id);
    const scopeGuard = req.user.scopeView === 'all' ? '' : `and scope = '${req.user.scopeView}'`;
    const r = await q(
      `update tasks
       set scope=$1, area=$2, title=$3, owner=$4, priority=$5, status=$6,
           start_date=$7, due_date=$8,
           completed_at = case when $6='Done' then coalesce(completed_at, now()) else null end,
           updated_at=now()
       where id=$9 ${scopeGuard}
       returning id`,
      [b.scope, b.area || null, b.title, b.owner || null, b.priority || null, b.status || 'Todo', start_date, due_date, id]
    );
    if(r.rowCount === 0) return json(res, 404, { error: 'Task not found (or not permitted)' });
    return json(res, 200, { ok: true, id });
  }

  const r = await q(
    `insert into tasks(scope, area, title, owner, priority, status, start_date, due_date, source)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     returning id`,
    [b.scope, b.area || null, b.title, b.owner || null, b.priority || null, b.status || 'Todo', start_date, due_date, 'UI']
  );
  return json(res, 200, { ok: true, id: r.rows[0].id });
}));
