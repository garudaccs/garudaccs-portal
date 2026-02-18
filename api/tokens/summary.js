import { json } from '../../lib/auth.js';
import { q } from '../../lib/db.js';
import { withAuth } from '../../lib/middleware.js';

export default withAuth(async function handler(req, res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const days = Math.max(1, Math.min(90, Number(url.searchParams.get('days') || '14')));

  const scopeWhere = req.user.scopeView === 'all' ? '' : `and scope = '${req.user.scopeView}'`;

  const byModel = await q(
    `select model, sum(input_tokens+output_tokens)::bigint as total_tokens
     from token_usage
     where used_at >= now() - ($1 || ' days')::interval
     ${scopeWhere}
     group by model
     order by total_tokens desc
     limit 20`,
    [days]
  );

  const byAgent = await q(
    `select agent, sum(input_tokens+output_tokens)::bigint as total_tokens
     from token_usage
     where used_at >= now() - ($1 || ' days')::interval
     ${scopeWhere}
     group by agent
     order by total_tokens desc
     limit 20`,
    [days]
  );

  return json(res, 200, { byModel: byModel.rows, byAgent: byAgent.rows });
});
