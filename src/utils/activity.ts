import { ActivityItem, GoalPlan } from '../types/goal';

export function createActivity(
  type: ActivityItem['type'],
  title: string,
  description?: string,
  timestamp?: string
): ActivityItem {
  return {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    title,
    description,
    timestamp: timestamp || new Date().toISOString(),
  };
}

export function appendActivity(
  plan: GoalPlan,
  activity: Omit<ActivityItem, 'id' | 'timestamp'> & { timestamp?: string }
): GoalPlan {
  const newActivity: ActivityItem = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...activity,
    timestamp: activity.timestamp || new Date().toISOString(),
  };

  const currentActivities = plan.activities || [];
  const updatedActivities = [newActivity, ...currentActivities].slice(0, 200);

  const currentStreak = plan.dayStreak || 0;
  const longestStreak = Math.max(plan.longestStreak || 0, currentStreak);

  return {
    ...plan,
    activities: updatedActivities,
    longestStreak,
  };
}

/**
 * Returns a comprehensive list of activities, backfilling historical activities from
 * plan.history, plan.weeklyCheckIns, and plan.createdAt if not already recorded.
 */
export function getAllActivities(plan: GoalPlan): ActivityItem[] {
  const recorded = plan.activities ? [...plan.activities] : [];

  // If there are recorded activities, verify if goal_started is present, otherwise append it
  const hasStarted = recorded.some((a) => a.type === 'goal_started');
  if (!hasStarted && plan.createdAt) {
    recorded.push({
      id: 'act_created',
      type: 'goal_started',
      title: 'Yearly Goal Initiated',
      description: `Committed to annual summit: "${plan.yearlyGoal}"`,
      timestamp: plan.createdAt,
    });
  }

  // Backfill from history if recorded list is minimal
  if (recorded.length <= 1 && plan.history && plan.history.length > 0) {
    plan.history.forEach((h, idx) => {
      const dateIso = `${h.date}T18:00:00.000Z`;
      if (h.tokenAwarded) {
        recorded.push({
          id: `act_token_${idx}`,
          type: 'reward_earned',
          title: 'Daily Victory Token Awarded',
          description: `All ${h.completedTaskIds?.length || plan.dailyTasks.length} daily actions completed for ${h.date}.`,
          timestamp: dateIso,
        });
      }
      if (h.completedTaskIds && h.completedTaskIds.length > 0) {
        recorded.push({
          id: `act_tasks_${idx}`,
          type: 'task_completed',
          title: `Completed ${h.completedTaskIds.length} Daily Tasks`,
          description: `Progress logged on ${h.date}`,
          timestamp: dateIso,
        });
      }
    });
  }

  // Backfill from weekly check-ins
  if (plan.weeklyCheckIns && plan.weeklyCheckIns.length > 0) {
    plan.weeklyCheckIns.forEach((w, idx) => {
      const alreadyHas = recorded.some((a) => a.id === `act_checkin_${w.id}` || a.title.includes(`Week ${w.weekNumber}`));
      if (!alreadyHas) {
        recorded.push({
          id: `act_checkin_${w.id || idx}`,
          type: 'weekly_checkin',
          title: `Week ${w.weekNumber} Reflection & Check-in`,
          description: `Paced at ${w.completionRatePercent}% completion (${w.tasksCompletedCount} tasks).`,
          timestamp: w.completedAt,
        });
      }
    });
  }

  return recorded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
