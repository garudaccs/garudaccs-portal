import { z } from 'zod';
import { json } from '../_lib/auth.js';
import { q } from '../_lib/db.js';
import { withAuth, allowRoles } from '../_lib/middleware.js';

const Body = z.object({
  id: z.union([z.string(), z.number()]),
  status: z.enum(['Todo','In Progress','Blocked','Done'])
});

export default withAuth(allowRoles(['Admin','Team'], async function handler(req, res){
  if(req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const parsed = Body.safeParse(JSON.parse(req.body || '{}'));
  if(!parsed.success) return json(res, 400, { error: 'Invalid payload' });

  const id = Number(parsed.data.id);
  const scopeGuard = req.user.scopeView === 'all' ? '' : `and scope = '${req.user.scopeView}'`;

  const r = await q(
    `update tasks set status=$1, updated_at=now() where id=$2 ${scopeGuard} returning id`,
    [parsed.data.status, id]
  );
  if(r.rowCount === 0) return json(res, 404, { error: 'Task not found (or not permitted)' });
  return json(res, 200, { ok: true });
}));
