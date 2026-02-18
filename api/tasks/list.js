import { json } from '../../lib/auth.js';
import { q } from '../../lib/db.js';
import { withAuth } from '../../lib/middleware.js';

export default withAuth(async function handler(req, res){
  const scopeWhere = req.user.scopeView === 'all' ? '' : `where scope = '${req.user.scopeView}'`;
  const r = await q(
    `select id, scope, area, title, owner, priority, status, source,
            to_char(updated_at, 'YYYY-MM-DD HH24:MI') as updated_at
     from tasks
     ${scopeWhere}
     order by updated_at desc
     limit 400`,
    []
  );
  return json(res, 200, { rows: r.rows });
});
