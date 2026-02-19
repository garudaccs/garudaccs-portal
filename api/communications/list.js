import { json } from '../../lib/auth.js';
import { q } from '../../lib/db.js';
import { withAuth } from '../../lib/middleware.js';

export default withAuth(async function handler(req, res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const agent = (url.searchParams.get('agent') || '').trim().slice(0, 80);

  const params = [];
  const where = [];

  if(req.user.scopeView !== 'all'){
    params.push(req.user.scopeView);
    where.push(`scope=$${params.length}`);
  }

  if(agent){
    params.push(agent);
    where.push(`(from_agent=$${params.length} or to_agent=$${params.length})`);
  }

  const whereSql = where.length ? ('where ' + where.join(' and ')) : '';

  const r = await q(
    `select id, scope,
            to_char(timestamp, 'YYYY-MM-DD HH24:MI') as timestamp,
            from_agent, to_agent, message_type, summary
     from communications
     ${whereSql}
     order by timestamp desc, id desc
     limit 600`,
    params
  );

  return json(res, 200, { rows: r.rows });
});
