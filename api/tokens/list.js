import { json } from '../../lib/auth.js';
import { q } from '../../lib/db.js';
import { withAuth } from '../../lib/middleware.js';

export default withAuth(async function handler(req, res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const days = Math.max(1, Math.min(90, Number(url.searchParams.get('days') || '14')));

  const scopeWhere = req.user.scopeView === 'all' ? '' : `and scope = '${req.user.scopeView}'`;

  const r = await q(
    `select to_char(date_trunc('day', used_at), 'YYYY-MM-DD') as day,
            model, agent, scope,
            input_tokens::int, output_tokens::int,
            (input_tokens+output_tokens)::int as total_tokens
     from token_usage
     where used_at >= now() - ($1 || ' days')::interval
     ${scopeWhere}
     order by used_at desc
     limit 500`,
    [days]
  );

  return json(res, 200, { rows: r.rows });
});
