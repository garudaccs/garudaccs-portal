import { json } from '../../lib/auth.js';
import { q } from '../../lib/db.js';
import { withAuth } from '../../lib/middleware.js';

function clampStr(s, n=80){
  return (s || '').toString().slice(0, n);
}

export default withAuth(async function handler(req, res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const scope = clampStr(url.searchParams.get('scope') || '');
  const owner = clampStr(url.searchParams.get('owner') || '');
  const priority = clampStr(url.searchParams.get('priority') || '');
  const status = clampStr(url.searchParams.get('status') || '');

  const where = [];
  const params = [];

  if(req.user.scopeView !== 'all'){
    params.push(req.user.scopeView);
    where.push(`scope=$${params.length}`);
  }else if(scope){
    params.push(scope);
    where.push(`scope=$${params.length}`);
  }

  if(owner){ params.push(owner); where.push(`owner=$${params.length}`); }
  if(priority){ params.push(priority); where.push(`priority=$${params.length}`); }
  if(status){ params.push(status); where.push(`status=$${params.length}`); }

  const whereSql = where.length ? ('where ' + where.join(' and ')) : '';

  const r = await q(
    `select id, scope, area, title, owner, priority, status, source,
            to_char(start_date, 'YYYY-MM-DD') as start_date,
            to_char(due_date, 'YYYY-MM-DD') as due_date,
            to_char(updated_at, 'YYYY-MM-DD HH24:MI') as updated_at
     from tasks
     ${whereSql}
     order by updated_at desc
     limit 800`,
    params
  );
  return json(res, 200, { rows: r.rows });
});
