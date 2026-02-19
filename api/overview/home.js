import { json } from '../../lib/auth.js';
import { q } from '../../lib/db.js';
import { withAuth } from '../../lib/middleware.js';

export default withAuth(async function handler(req, res){
  const scopeWhere = req.user.scopeView === 'all' ? '' : `where scope='${req.user.scopeView}'`;
  const scopeAnd = req.user.scopeView === 'all' ? '' : `and scope='${req.user.scopeView}'`;

  const counts = await q(
    `select
      count(*)::int as total,
      sum(case when status='In Progress' then 1 else 0 end)::int as in_progress,
      sum(case when status='Blocked' then 1 else 0 end)::int as blocked,
      sum(case when status='Done' then 1 else 0 end)::int as done
     from tasks
     ${scopeWhere}`,
    []
  );

  const upcomingReminders = await q(
    `select id, title, to_char(due_date,'YYYY-MM-DD') as due_date, priority, category, scope
     from reminders
     where status='Open'
     ${scopeAnd}
     order by due_date asc nulls last, id desc
     limit 8`,
    []
  );

  const team = await q(
    `select agent, status, to_char(last_activity_at, 'YYYY-MM-DD HH24:MI') as last_activity_at, details
     from agent_activity
     ${scopeWhere}
     order by agent asc
     limit 50`,
    []
  );

  const activity = await q(
    `select to_char(timestamp, 'YYYY-MM-DD HH24:MI') as ts, from_agent, to_agent, summary, message_type, scope
     from communications
     where timestamp >= now() - interval '14 days'
     ${scopeAnd}
     order by timestamp desc
     limit 25`,
    []
  );

  const burn = await q(
    `select to_char(date_trunc('day', used_at), 'YYYY-MM-DD') as day,
            sum(input_tokens+output_tokens)::bigint as total_tokens
     from token_usage
     where used_at >= now() - interval '21 days'
     ${scopeAnd}
     group by 1
     order by 1 asc`,
    []
  );

  return json(res, 200, {
    counts: counts.rows[0],
    reminders: upcomingReminders.rows,
    team: team.rows,
    activity: activity.rows,
    tokenBurnDaily: burn.rows
  });
});
