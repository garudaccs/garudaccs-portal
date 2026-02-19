import { json } from '../lib/auth.js';
import { q } from '../lib/db.js';
import { withAuth } from '../lib/middleware.js';

export default withAuth(async function handler(req, res){
  const scopeWhere = req.user.scopeView === 'all' ? '' : `where scope = '${req.user.scopeView}'`;
  const r = await q(
    `select agent, status, to_char(last_activity_at, 'YYYY-MM-DD HH24:MI') as last_activity_at, details
     from agent_activity
     ${scopeWhere}
     order by agent asc`,
    []
  );
  return json(res, 200, { rows: r.rows });
});
