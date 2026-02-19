import { json } from '../../lib/auth.js';
import { q } from '../../lib/db.js';
import { withAuth } from '../../lib/middleware.js';

export default withAuth(async function handler(req, res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const status = (url.searchParams.get('status') || '').trim();

  const params = [];
  const where = [];

  if(req.user.scopeView !== 'all'){
    params.push(req.user.scopeView);
    where.push(`scope=$${params.length}`);
  }
  if(status){
    params.push(status);
    where.push(`status=$${params.length}`);
  }

  const whereSql = where.length ? ('where ' + where.join(' and ')) : '';

  const r = await q(
    `select id, scope, title,
            to_char(due_date, 'YYYY-MM-DD') as due_date,
            priority, category, status,
            to_char(updated_at, 'YYYY-MM-DD HH24:MI') as updated_at,
            created_by
     from reminders
     ${whereSql}
     order by (case when status='Open' then 0 else 1 end), due_date asc nulls last, id desc
     limit 500`,
    params
  );

  return json(res, 200, { rows: r.rows });
});
