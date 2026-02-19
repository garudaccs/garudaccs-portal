import { json } from '../../lib/auth.js';
import { q } from '../../lib/db.js';
import { withAuth } from '../../lib/middleware.js';

export default withAuth(async function handler(req, res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const qStr = (url.searchParams.get('q') || '').trim().slice(0, 200);

  const params = [];
  const where = [];

  if(req.user.scopeView !== 'all'){
    params.push(req.user.scopeView);
    where.push(`scope=$${params.length}`);
  }
  if(qStr){
    params.push('%' + qStr + '%');
    where.push(`(decision ilike $${params.length} or context ilike $${params.length} or decided_by ilike $${params.length})`);
  }

  const whereSql = where.length ? ('where ' + where.join(' and ')) : '';

  const r = await q(
    `select id, scope, to_char(date, 'YYYY-MM-DD') as date, decision, context, decided_by
     from decisions
     ${whereSql}
     order by date desc, id desc
     limit 500`,
    params
  );

  return json(res, 200, { rows: r.rows });
});
