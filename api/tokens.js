import { json } from '../lib/auth.js';
import { q } from '../lib/db.js';
import { withAuth } from '../lib/middleware.js';

export default withAuth(async function handler(req, res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const days = Math.max(1, Math.min(90, Number(url.searchParams.get('days') || '14')));
  const mode = url.searchParams.get('mode') || 'list';
  const scopeWhere = req.user.scopeView === 'all' ? '' : `and scope = '${req.user.scopeView}'`;

  if(mode === 'summary'){
    const byModel = await q(`select model, sum(input_tokens+output_tokens)::bigint as total_tokens from token_usage where used_at >= now() - ($1 || ' days')::interval ${scopeWhere} group by model order by total_tokens desc limit 20`, [days]);
    const byAgent = await q(`select agent, sum(input_tokens+output_tokens)::bigint as total_tokens from token_usage where used_at >= now() - ($1 || ' days')::interval ${scopeWhere} group by agent order by total_tokens desc limit 20`, [days]);
    return json(res, 200, { byModel: byModel.rows, byAgent: byAgent.rows });
  }

  const r = await q(`select to_char(date_trunc('day', used_at), 'YYYY-MM-DD') as day, model, agent, scope, input_tokens::int, output_tokens::int, (input_tokens+output_tokens)::int as total_tokens from token_usage where used_at >= now() - ($1 || ' days')::interval ${scopeWhere} order by used_at desc limit 500`, [days]);
  return json(res, 200, { rows: r.rows });
});
