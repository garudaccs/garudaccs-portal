import { json } from '../lib/auth.js';
import { q } from '../lib/db.js';
import { withAuth } from '../lib/middleware.js';

export default withAuth(async function handler(req, res){
  const scopeWhere = req.user.scopeView === 'all' ? '' : `where scope='${req.user.scopeView}'`;
  const scopeAnd = req.user.scopeView === 'all' ? '' : `and scope='${req.user.scopeView}'`;

  const agents = await q(
    `select agent, status, to_char(last_activity_at, 'YYYY-MM-DD HH24:MI') as last_activity_at, details, scope
     from agent_activity
     ${scopeWhere}
     order by agent asc`,
    []
  );

  const inprog = await q(
    `select owner as agent, count(*)::int as in_progress
     from tasks
     where status='In Progress'
     ${scopeAnd}
     group by owner
     order by in_progress desc`,
    []
  );

  const tokens = await q(
    `select agent, sum(input_tokens+output_tokens)::bigint as total_tokens
     from token_usage
     where used_at >= now() - interval '7 days'
     ${scopeAnd}
     group by agent
     order by total_tokens desc`,
    []
  );

  const recentComms = await q(
    `select from_agent as agent, max(timestamp) as last_ts
     from communications
     where timestamp >= now() - interval '14 days'
     ${scopeAnd}
     group by from_agent`,
    []
  );

  return json(res, 200, {
    agents: agents.rows,
    inProgressByAgent: inprog.rows,
    tokensByAgent: tokens.rows,
    recentCommsByAgent: recentComms.rows
  });
});
