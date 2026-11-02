export interface ClarifyingQuestion {
  id: string;
  question: string;
  hint?: string;
  defaultValue: string;
  quickOptions?: string[];
}

export interface MonthlyGoal {
  id: string;
  monthIndex: number; // 1 to 12
  monthName: string;
  targetValue: number;
  originalTargetValue: number; // For enforcing "cannot lower below original or current target"
  currentValue: number;
  unit: string;
  milestoneTitle: string;
  keyFocus: string;
  isCustomAdded?: boolean;
}

export interface WeeklyAction {
  id: string;
  title: string;
  targetPerWeek: number;
  unit: string;
  whyItMatters: string;
}

export interface DailyTask {
  id: string;
  title: string;
  category: string;
  dailyQuota: number;
  unit: string;
  completed: boolean;
  completedCount?: number;
  mathTracing: string;
}

export interface BackwardMathExplanation {
  yearlyTargetText: string;
  formulaSummary: string;
  monthlyBreakdownExplanation: string;
  dailyCommitmentExplanation: string;
}

export interface MajorMilestone {
  id: string;
  title: string;
  targetMonth: number; // 1 to 12
  targetCumulativeValue: number;
  badgeIcon: string;
  badgeName: string;
  description: string;
  isReached?: boolean;
  reachedDate?: string;
}

export interface WeeklyCheckIn {
  id: string;
  weekNumber: number;
  dateRange: string;
  completedAt: string;
  tasksCompletedCount: number;
  totalTasksScheduled: number;
  completionRatePercent: number;
  monthlyProgress: {
    monthName: string;
    completed: number;
    target: number;
    unit: string;
    percent: number;
  };
  yearlyProgress: {
    completed: number;
    target: number;
    unit: string;
    percent: number;
  };
  suggestedTweaks: {
    title: string;
    advice: string;
    category: 'Pacing' | 'Habit' | 'Strategy';
  }[];
  userReflection?: string;
  confidenceRating?: 'Crushing It' | 'Steady & On Track' | 'Needs Gentle Focus';
}

export interface ActivityItem {
  id: string;
  type:
    | 'task_completed'
    | 'task_unticked'
    | 'reward_earned'
    | 'monthly_edited'
    | 'monthly_extended'
    | 'weekly_checkin'
    | 'work_redistributed'
    | 'goal_started';
  title: string;
  description?: string;
  timestamp: string; // ISO date string
}

export interface GoalPlan {
  id: string;
  ownerId?: string;
  yearlyGoal: string;
  createdAt: string;
  updatedAt?: string;
  metricName: string;
  yearlyTargetNumber: number;
  mathExplanation: BackwardMathExplanation;
  monthlyGoals: MonthlyGoal[];
  weeklyActions: WeeklyAction[];
  dailyTasks: DailyTask[];
  majorMilestones?: MajorMilestone[];
  weeklyCheckIns?: WeeklyCheckIn[];
  tokensEarned: number;
  dayStreak: number;
  longestStreak?: number;
  lastCompletedDate?: string; // YYYY-MM-DD
  activities?: ActivityItem[];
  history: {
    date: string;
    completedTaskIds: string[];
    tokenAwarded: boolean;
  }[];
}
