import React, { useState, useMemo } from 'react';
import { GoalPlan, MonthlyGoal, WeeklyCheckIn } from '../types/goal';
import { useAuth } from '../context/AuthContext';
import { getAllActivities } from '../utils/activity';
import {
  Sparkles,
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar,
  Flame,
  ArrowUpRight,
  Filter,
  Check,
  RotateCw,
  Edit2,
  Plus,
  Clock,
  Compass,
  Layers,
  ChevronRight,
  CalendarCheck,
  ChevronDown,
  X,
  Target,
  Smile,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface DashboardViewProps {
  plan: GoalPlan;
  onNavigateTab: (tab: 'daily' | 'weekly' | 'monthly' | 'math' | 'new_goal') => void;
  onUpdatePlan?: (updatedPlan: GoalPlan) => void;
}

type TimelineFilter = 'week' | 'month' | 'all';

export const DashboardView: React.FC<DashboardViewProps> = ({
  plan,
  onNavigateTab,
}) => {
  const { profile, user } = useAuth();
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');
  const [showPastCheckInsModal, setShowPastCheckInsModal] = useState(false);
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<{
    dateStr: string;
    displayDate: string;
    status: 'perfect' | 'partial' | 'missed';
    taskCount: number;
    tokenAwarded: boolean;
  } | null>(null);

  // User Greeting
  const firstName = profile?.firstName || user?.displayName?.split(' ')[0] || 'Friend';

  // Account creation / Journey Day calculation
  const journeyStartDate = useMemo(() => {
    const rawDate = profile?.createdAt || plan.createdAt;
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [profile?.createdAt, plan.createdAt]);

  const daysElapsed = useMemo(() => {
    const now = new Date();
    const start = new Date(journeyStartDate);
    now.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    const diffMs = now.getTime() - start.getTime();
    return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
  }, [journeyStartDate]);

  // Overall Yearly Target and Completion
  const totalYearlyCompleted = useMemo(() => {
    return plan.monthlyGoals.reduce((sum, m) => sum + (m.currentValue || 0), 0);
  }, [plan.monthlyGoals]);

  const totalYearlyTarget = plan.yearlyTargetNumber || 25;
  const yearlyProgressPercent = Math.min(
    100,
    Math.round((totalYearlyCompleted / totalYearlyTarget) * 100)
  );

  // Pacing status: On Track vs Behind
  const expectedPacedTarget = useMemo(() => {
    // 365-day linear benchmark for the year
    return (totalYearlyTarget * Math.min(daysElapsed, 365)) / 365;
  }, [totalYearlyTarget, daysElapsed]);

  const isOnTrack = totalYearlyCompleted >= Math.floor(expectedPacedTarget);
  const catchUpGap = Math.max(0, Math.ceil(expectedPacedTarget - totalYearlyCompleted));

  // Stats Calculations
  // 1. All-time completed tasks: sum from history + any completed daily tasks not yet in history
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const allTimeTasksCompleted = useMemo(() => {
    const historyCount =
      plan.history?.reduce((acc, h) => acc + (h.completedTaskIds?.length || 0), 0) || 0;
    const todayInHistory = plan.history?.some((h) => h.date === todayStr);
    const currentTicked = plan.dailyTasks.filter((t) => t.completed).length;

    // If today is already saved in history, don't double count current ticked tasks
    return todayInHistory ? historyCount : historyCount + currentTicked;
  }, [plan.history, plan.dailyTasks, todayStr]);

  // 2. Streaks
  const currentStreak = plan.dayStreak || 0;
  const longestStreak = Math.max(plan.longestStreak || 0, currentStreak);

  // 3. Tokens earned
  const tokensEarned = plan.tokensEarned || 0;

  // 4. Completion Rate (% of planned tasks completed)
  const completionRate = useMemo(() => {
    const dailyQuotaSum = plan.dailyTasks.length;
    if (dailyQuotaSum === 0) return 100;
    const totalScheduled = Math.max(dailyQuotaSum, daysElapsed * dailyQuotaSum);
    return Math.min(100, Math.max(0, Math.round((allTimeTasksCompleted / totalScheduled) * 100)));
  }, [plan.dailyTasks.length, daysElapsed, allTimeTasksCompleted]);

  // Activity History & Filters
  const allActivities = useMemo(() => {
    return getAllActivities(plan);
  }, [plan]);

  const filteredActivities = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (timelineFilter === 'week') {
      return allActivities.filter((a) => new Date(a.timestamp) >= startOfWeek);
    }
    if (timelineFilter === 'month') {
      return allActivities.filter((a) => new Date(a.timestamp) >= startOfMonth);
    }
    return allActivities;
  }, [allActivities, timelineFilter]);

  // Activity Heatmap Generation (from account creation to today)
  const heatmapDays = useMemo(() => {
    const days: {
      dateStr: string;
      displayDate: string;
      status: 'perfect' | 'partial' | 'missed';
      taskCount: number;
      tokenAwarded: boolean;
      dayOfWeek: number;
    }[] = [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const start = new Date(journeyStartDate);
    start.setHours(0, 0, 0, 0);

    // If journey just started today, provide at least a 14-day window so the calendar looks pleasant
    const displayStart = new Date(start);
    const dayDiff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (dayDiff < 14) {
      displayStart.setDate(now.getDate() - 13);
    }

    const iter = new Date(displayStart);
    while (iter <= now) {
      const dateStr = iter.toISOString().split('T')[0];
      const isToday = dateStr === todayStr;

      // Check in history
      const historyRecord = plan.history?.find((h) => h.date === dateStr);
      let status: 'perfect' | 'partial' | 'missed' = 'missed';
      let taskCount = 0;
      let tokenAwarded = false;

      if (isToday) {
        taskCount = plan.dailyTasks.filter((t) => t.completed).length;
        const total = plan.dailyTasks.length;
        tokenAwarded = Boolean(historyRecord?.tokenAwarded || (total > 0 && taskCount === total));
        if (tokenAwarded || (total > 0 && taskCount === total)) {
          status = 'perfect';
        } else if (taskCount > 0) {
          status = 'partial';
        } else {
          status = 'missed';
        }
      } else if (historyRecord) {
        taskCount = historyRecord.completedTaskIds?.length || 0;
        tokenAwarded = Boolean(historyRecord.tokenAwarded);
        status = tokenAwarded ? 'perfect' : taskCount > 0 ? 'partial' : 'missed';
      }

      days.push({
        dateStr,
        displayDate: new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }).format(iter),
        status,
        taskCount,
        tokenAwarded,
        dayOfWeek: iter.getDay(),
      });

      iter.setDate(iter.getDate() + 1);
    }

    return days;
  }, [journeyStartDate, plan.history, plan.dailyTasks, todayStr]);

  // Weekly Trend: calculate completed tasks per week since sign-up
  const weeklyTrendData = useMemo(() => {
    // Group days into weeks starting from Sunday/Monday
    const weeksMap: { [weekKey: string]: { label: string; count: number; dateRange: string } } = {};

    // Seed up to 6 weeks or the weeks elapsed
    const now = new Date();
    const weeksCount = Math.max(4, Math.ceil(daysElapsed / 7));

    for (let i = weeksCount - 1; i >= 0; i--) {
      const wDate = new Date(now);
      wDate.setDate(now.getDate() - i * 7);
      const label = `W${weeksCount - i}`;
      const weekKey = `week_${weeksCount - i}`;
      weeksMap[weekKey] = {
        label,
        count: 0,
        dateRange: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(wDate),
      };
    }

    // Populate counts from heatmap days
    heatmapDays.forEach((day) => {
      const d = new Date(day.dateStr);
      const diffFromNowDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(diffFromNowDays / 7);
      const weekNum = weeksCount - weekIndex;
      const key = `week_${weekNum}`;
      if (weeksMap[key]) {
        weeksMap[key].count += day.taskCount;
      }
    });

    return Object.values(weeksMap);
  }, [heatmapDays, daysElapsed]);

  // Maximum count for SVG scaling
  const maxWeeklyCount = useMemo(() => {
    const max = Math.max(...weeklyTrendData.map((w) => w.count), 5);
    return Math.ceil(max * 1.25);
  }, [weeklyTrendData]);

  // Latest Weekly Check-In
  const latestCheckIn: WeeklyCheckIn | null = useMemo(() => {
    if (plan.weeklyCheckIns && plan.weeklyCheckIns.length > 0) {
      return plan.weeklyCheckIns[0]; // first item is newest
    }
    return null;
  }, [plan.weeklyCheckIns]);

  // Helper format relative time
  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

      if (diffDays === 0) {
        return `Today, ${timeStr}`;
      } else if (diffDays === 1) {
        return `Yesterday, ${timeStr}`;
      } else if (diffDays < 7) {
        return `${date.toLocaleDateString('en-US', { weekday: 'short' })}, ${timeStr}`;
      }
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
    } catch {
      return 'Recently';
    }
  };

  // Activity icon rendering
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return <CheckCircle2 className="w-4 h-4 text-[#3F5A44]" />;
      case 'reward_earned':
        return <Award className="w-4 h-4 text-[#3F5A44]" />;
      case 'monthly_edited':
      case 'monthly_extended':
        return <ArrowUpRight className="w-4 h-4 text-[#3F5A44]" />;
      case 'weekly_checkin':
        return <CalendarCheck className="w-4 h-4 text-[#3F5A44]" />;
      case 'work_redistributed':
        return <RotateCw className="w-4 h-4 text-[#3F5A44]" />;
      case 'goal_started':
      default:
        return <Sparkles className="w-4 h-4 text-[#3F5A44]" />;
    }
  };

  const isBrandNewUser = allTimeTasksCompleted === 0 && (plan.tokensEarned || 0) === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-6">
      {/* TOP SECTION: Greeting, Journey Day & Yearly Goal Card */}
      <section className="space-y-4">
        {/* Personalized Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🌸</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#3F5A44]">
                Welcome, {firstName}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#4A3038]/80 mt-0.5 font-medium">
              Day <span className="font-bold text-[#3F5A44]">{daysElapsed}</span> of your journey
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F8DDE3] text-[#3F5A44] border border-[#e8bac3]">
              <Flame className="w-3.5 h-3.5 text-[#3F5A44]" />
              <span>{currentStreak} Day Streak</span>
            </span>
          </div>
        </div>

        {/* Yearly Goal Card */}
        <div className="bg-white/95 rounded-3xl p-5 sm:p-6 border border-[#F8DDE3] shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#F8DDE3]/30 rounded-bl-full pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#CFDDC9]/70 text-[#3F5A44]">
                  Yearly Goal
                </span>
                {/* On-Track or Behind status badge */}
                {isOnTrack ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#A9C2A5]/30 text-[#3F5A44] border border-[#A9C2A5]/60">
                    <Check className="w-3 h-3 text-[#3F5A44]" />
                    <span>On Track</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F8DDE3] text-[#4A3038] border border-[#e8bac3]">
                    <Clock className="w-3 h-3 text-[#4A3038]" />
                    <span>Behind by {catchUpGap} {plan.metricName || 'units'}</span>
                  </span>
                )}
              </div>

              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#3F5A44] leading-snug">
                {plan.yearlyGoal}
              </h3>
              <p className="text-xs sm:text-sm text-[#4A3038]/70">
                {totalYearlyCompleted} of {totalYearlyTarget} {plan.metricName || 'units'} done ({yearlyProgressPercent}% complete).
              </p>
            </div>

            <div className="flex flex-col sm:items-end justify-center min-w-[140px]">
              <span className="font-serif text-3xl sm:text-4xl font-bold text-[#3F5A44]">
                {yearlyProgressPercent}%
              </span>
              <span className="text-[11px] text-[#4A3038]/60 font-medium">
                Complete
              </span>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="mt-4 space-y-1.5 relative z-10">
            <div className="w-full bg-[#FFFAF7] h-3.5 rounded-full p-0.5 border border-[#F8DDE3] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#A9C2A5] transition-all duration-700 ease-out shadow-xs"
                style={{ width: `${Math.max(4, yearlyProgressPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#4A3038]/70 px-0.5 font-medium">
              <span>Day 1</span>
              <span>
                {isOnTrack
                  ? '✨ You are on track! Keep going.'
                  : `🌱 Complete today's tasks to catch up (${catchUpGap} ${plan.metricName || 'units'} behind pace)`}
              </span>
              <span>Day 365</span>
            </div>
          </div>
        </div>
      </section>

      {/* FRIENDLY EMPTY STATE: for new users with 0 completed tasks */}
      {isBrandNewUser && (
        <div className="bg-[#F8DDE3]/50 rounded-3xl p-5 border border-[#F8DDE3] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#3F5A44] shadow-xs shrink-0">
              <Smile className="w-6 h-6 text-[#3F5A44]" />
            </div>
            <div>
              <h4 className="font-serif text-base font-bold text-[#3F5A44]">
                Your journey starts today!
              </h4>
              <p className="text-xs text-[#4A3038]/80 leading-relaxed">
                Complete your first task in Today's Plan to begin your streak, earn tokens, and light up your activity calendar.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('daily')}
            className="px-4 py-2.5 rounded-2xl bg-[#3F5A44] hover:bg-[#2d4231] text-[#FFFAF7] font-semibold text-xs transition cursor-pointer shadow-xs shrink-0 active:scale-98"
          >
            Start Today's Tasks
          </button>
        </div>
      )}

      {/* STATS (Cards, two per row) */}
      <section className="space-y-2">
        <h3 className="font-serif text-base sm:text-lg font-bold text-[#3F5A44]">
          Your Stats
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Card 1: Tasks completed (all time) */}
          <div className="bg-white/95 rounded-2xl p-4 sm:p-5 border border-[#F8DDE3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#4A3038]/70 mb-2">
              <span className="text-xs sm:text-sm font-medium">Tasks Completed</span>
              <div className="w-8 h-8 rounded-xl bg-[#F8DDE3] flex items-center justify-center text-[#3F5A44]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-[#3F5A44]">
                {allTimeTasksCompleted}
              </div>
              <p className="text-[11px] text-[#4A3038]/60 mt-0.5">Tasks completed since joining</p>
            </div>
          </div>

          {/* Card 2: Current streak & longest streak */}
          <div className="bg-white/95 rounded-2xl p-4 sm:p-5 border border-[#F8DDE3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#4A3038]/70 mb-2">
              <span className="text-xs sm:text-sm font-medium">Daily Streak</span>
              <div className="w-8 h-8 rounded-xl bg-[#CFDDC9]/70 flex items-center justify-center text-[#3F5A44]">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-[#3F5A44]">
                {currentStreak} <span className="text-sm font-sans font-medium text-[#4A3038]/70">days in a row</span>
              </div>
              <p className="text-[11px] text-[#4A3038]/60 mt-0.5">
                Longest streak: <span className="font-bold text-[#3F5A44]">{longestStreak} days</span>
              </p>
            </div>
          </div>

          {/* Card 3: Tokens earned */}
          <div className="bg-white/95 rounded-2xl p-4 sm:p-5 border border-[#F8DDE3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#4A3038]/70 mb-2">
              <span className="text-xs sm:text-sm font-medium">Tokens Earned</span>
              <div className="w-8 h-8 rounded-xl bg-[#F8DDE3] flex items-center justify-center text-[#3F5A44]">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-[#3F5A44] flex items-center gap-1.5">
                <span>{tokensEarned}</span>
                <span className="text-base">🌸</span>
              </div>
              <p className="text-[11px] text-[#4A3038]/60 mt-0.5">1 token earned for each perfect day</p>
            </div>
          </div>

          {/* Card 4: Completion rate */}
          <div className="bg-white/95 rounded-2xl p-4 sm:p-5 border border-[#F8DDE3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#4A3038]/70 mb-2">
              <span className="text-xs sm:text-sm font-medium">Completion Rate</span>
              <div className="w-8 h-8 rounded-xl bg-[#CFDDC9]/70 flex items-center justify-center text-[#3F5A44]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-[#3F5A44]">
                {completionRate}%
              </div>
              <p className="text-[11px] text-[#4A3038]/60 mt-0.5">Percentage of planned tasks finished</p>
            </div>
          </div>
        </div>
      </section>

      {/* PROGRESS VIEWS: Monthly Progress, Weekly Trend, Activity Calendar */}
      <section className="space-y-6">
        <div className="border-t border-[#F8DDE3]/80 pt-6">
          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#3F5A44] mb-3">
            Progress Views
          </h3>
        </div>

        {/* 1. Monthly Progress: Target vs Actual (Fixed Monthly + Extras) */}
        <div className="bg-white/95 rounded-3xl p-5 sm:p-6 border border-[#F8DDE3] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-serif text-base font-bold text-[#3F5A44] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#3F5A44]" />
                <span>Monthly Progress</span>
              </h4>
              <p className="text-xs text-[#4A3038]/70">
                Target vs completed for each of the 12 months
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('monthly')}
              className="text-xs font-semibold text-[#3F5A44] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All 12 Months</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Monthly progress bars */}
          <div className="space-y-3 pt-2">
            {plan.monthlyGoals.map((m) => {
              const pct = m.targetValue > 0 ? Math.min(100, Math.round((m.currentValue / m.targetValue) * 100)) : 0;
              const isRaised = m.originalTargetValue && m.targetValue > m.originalTargetValue;

              return (
                <div key={m.id} className="space-y-1.5 p-3 rounded-2xl bg-[#FFFAF7] border border-[#F8DDE3]/60">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[#3F5A44]">{m.monthName}</span>
                      {m.isCustomAdded && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F8DDE3] text-[#3F5A44]">
                          Extra Added
                        </span>
                      )}
                      {isRaised && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#CFDDC9] text-[#3F5A44]">
                          Raised (Base: {m.originalTargetValue})
                        </span>
                      )}
                      <span className="text-[#4A3038]/60 text-[11px] truncate max-w-[180px] hidden sm:inline">
                        • {m.milestoneTitle}
                      </span>
                    </div>
                    <div className="text-right font-semibold text-[#3F5A44]">
                      <span>{m.currentValue}</span>
                      <span className="text-[#4A3038]/50"> / </span>
                      <span>{m.targetValue} {m.unit}</span>
                      <span className="text-[11px] text-[#4A3038]/60 ml-1.5 font-normal">
                        ({pct}%)
                      </span>
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="w-full bg-white h-2.5 rounded-full border border-[#F8DDE3] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 100 ? 'bg-[#3F5A44]' : 'bg-[#A9C2A5]'
                      }`}
                      style={{ width: `${Math.max(pct > 0 ? 3 : 0, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Weekly Trend: Line Chart of Tasks Completed Per Week */}
        <div className="bg-white/95 rounded-3xl p-5 sm:p-6 border border-[#F8DDE3] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-serif text-base font-bold text-[#3F5A44] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#3F5A44]" />
                <span>Weekly Trend</span>
              </h4>
              <p className="text-xs text-[#4A3038]/70">
                Tasks completed each week since you joined
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#CFDDC9]/60 text-[#3F5A44]">
              {weeklyTrendData.reduce((sum, w) => sum + w.count, 0)} Total Tasks
            </span>
          </div>

          {/* SVG Line Chart */}
          <div className="pt-2">
            <div className="w-full h-44 sm:h-52 relative">
              <svg
                viewBox="0 0 500 180"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A9C2A5" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#A9C2A5" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Grid horizontal guidelines */}
                {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = 150 - ratio * 120;
                  return (
                    <g key={idx}>
                      <line
                        x1="35"
                        y1={y}
                        x2="480"
                        y2={y}
                        stroke="#F8DDE3"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x="10"
                        y={y + 3}
                        fontSize="9"
                        fill="#4A3038"
                        opacity="0.5"
                        textAnchor="start"
                      >
                        {Math.round(maxWeeklyCount * ratio)}
                      </text>
                    </g>
                  );
                })}

                {/* Base axis */}
                <line x1="35" y1="150" x2="480" y2="150" stroke="#F8DDE3" strokeWidth="1.5" />

                {/* Plot line coordinates */}
                {(() => {
                  const points = weeklyTrendData.map((w, idx) => {
                    const step = (480 - 45) / Math.max(1, weeklyTrendData.length - 1);
                    const x = 45 + idx * step;
                    const y = 150 - (w.count / maxWeeklyCount) * 120;
                    return { x, y, ...w };
                  });

                  if (points.length === 0) return null;

                  const linePath = points
                    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                    .join(' ');

                  const areaPath = `${linePath} L ${points[points.length - 1].x} 150 L ${points[0].x} 150 Z`;

                  return (
                    <>
                      {/* Gradient area */}
                      <path d={areaPath} fill="url(#areaGrad)" />

                      {/* Line */}
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#3F5A44"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Circles for each point */}
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="5"
                            fill="#FFFAF7"
                            stroke="#3F5A44"
                            strokeWidth="2.5"
                          />
                          <text
                            x={p.x}
                            y={p.y - 10}
                            fontSize="10"
                            fontWeight="bold"
                            fill="#3F5A44"
                            textAnchor="middle"
                          >
                            {p.count}
                          </text>
                          <text
                            x={p.x}
                            y="166"
                            fontSize="9"
                            fill="#4A3038"
                            opacity="0.7"
                            textAnchor="middle"
                          >
                            {p.label}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#4A3038]/60 px-2 pt-1 font-medium">
              <span>Account created</span>
              <span>Tasks completed each week</span>
              <span>This week</span>
            </div>
          </div>
        </div>

        {/* 3. Activity Calendar Heatmap */}
        <div className="bg-white/95 rounded-3xl p-5 sm:p-6 border border-[#F8DDE3] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-serif text-base font-bold text-[#3F5A44] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#3F5A44]" />
                <span>Activity Calendar</span>
              </h4>
              <p className="text-xs text-[#4A3038]/70">
                Every day since you joined: soft pink for all tasks done, light sage for partial, blank for missed
              </p>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center gap-3 text-[11px] text-[#4A3038]/80 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-[#F8DDE3] border border-[#e5abb7]" />
                <span>Perfect Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-[#CFDDC9] border border-[#A9C2A5]" />
                <span>Partial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-[#FFFAF7] border border-[#F8DDE3]" />
                <span>Missed</span>
              </div>
            </div>
          </div>

          {/* Grid of days */}
          <div className="pt-2">
            <div className="flex flex-wrap gap-2 sm:gap-2.5">
              {heatmapDays.map((day) => {
                const isSelected = selectedHeatmapDay?.dateStr === day.dateStr;
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => setSelectedHeatmapDay(day)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex flex-col items-center justify-center transition cursor-pointer relative shadow-2xs ${
                      day.status === 'perfect'
                        ? 'bg-[#F8DDE3] border-2 border-[#e5abb7] text-[#3F5A44] font-bold'
                        : day.status === 'partial'
                        ? 'bg-[#CFDDC9] border-2 border-[#A9C2A5] text-[#3F5A44] font-semibold'
                        : 'bg-[#FFFAF7] border border-[#F8DDE3] text-[#4A3038]/40'
                    } ${isSelected ? 'ring-2 ring-[#3F5A44] scale-105' : 'hover:scale-105'}`}
                    title={`${day.displayDate}: ${
                      day.status === 'perfect'
                        ? 'Perfect day (all tasks completed, token awarded)'
                        : day.status === 'partial'
                        ? `${day.taskCount} tasks completed`
                        : 'Missed tasks'
                    }`}
                  >
                    <span className="text-[10px] leading-none">
                      {new Date(day.dateStr).getDate()}
                    </span>
                    {day.status === 'perfect' && (
                      <span className="text-[8px] leading-none mt-0.5">🌸</span>
                    )}
                    {day.status === 'partial' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3F5A44] mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected day popover / details info card */}
            {selectedHeatmapDay && (
              <div className="mt-4 p-3.5 rounded-2xl bg-[#FFFAF7] border border-[#F8DDE3] flex items-center justify-between text-xs text-[#3F5A44] animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">
                    {selectedHeatmapDay.status === 'perfect'
                      ? '🌸'
                      : selectedHeatmapDay.status === 'partial'
                      ? '🌿'
                      : '🌱'}
                  </span>
                  <div>
                    <span className="font-bold">{selectedHeatmapDay.displayDate}:</span>{' '}
                    <span>
                      {selectedHeatmapDay.status === 'perfect'
                        ? `Perfect Day! All tasks completed + 1 Victory Token awarded.`
                        : selectedHeatmapDay.status === 'partial'
                        ? `Partial progress (${selectedHeatmapDay.taskCount} tasks completed).`
                        : `Missed day (redistributed safely into future quota).`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedHeatmapDay(null)}
                  className="p-1 text-[#4A3038]/60 hover:text-[#4A3038]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ACTIVITY HISTORY: Scrollable timeline, newest first, filter by week, month, all time */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#F8DDE3]/80 pt-6">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#3F5A44] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#3F5A44]" />
              <span>Activity History</span>
            </h3>
            <p className="text-xs text-[#4A3038]/70">
              A timeline of everything done on your account
            </p>
          </div>

          {/* Filter buttons */}
          <div className="flex items-center p-1 rounded-2xl bg-white border border-[#F8DDE3] shadow-2xs gap-1 self-start sm:self-auto">
            <button
              onClick={() => setTimelineFilter('week')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                timelineFilter === 'week'
                  ? 'bg-[#3F5A44] text-[#FFFAF7]'
                  : 'text-[#4A3038] hover:bg-[#F8DDE3]/40'
              }`}
            >
              This week
            </button>
            <button
              onClick={() => setTimelineFilter('month')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                timelineFilter === 'month'
                  ? 'bg-[#3F5A44] text-[#FFFAF7]'
                  : 'text-[#4A3038] hover:bg-[#F8DDE3]/40'
              }`}
            >
              This month
            </button>
            <button
              onClick={() => setTimelineFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                timelineFilter === 'all'
                  ? 'bg-[#3F5A44] text-[#FFFAF7]'
                  : 'text-[#4A3038] hover:bg-[#F8DDE3]/40'
              }`}
            >
              All time
            </button>
          </div>
        </div>

        {/* Scrollable Timeline List */}
        <div className="bg-white/95 rounded-3xl p-5 sm:p-6 border border-[#F8DDE3] shadow-xs">
          {filteredActivities.length === 0 ? (
            <div className="py-8 text-center text-[#4A3038]/60 text-xs">
              No activity logged for this time yet. Complete daily tasks or check-ins to see updates!
            </div>
          ) : (
            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#F8DDE3]">
              {filteredActivities.map((act) => (
                <div key={act.id} className="relative group">
                  {/* Timeline bullet icon */}
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-[#F8DDE3] border border-[#e5abb7] flex items-center justify-center shadow-2xs">
                    {getActivityIcon(act.type)}
                  </div>

                  {/* Activity Details Card */}
                  <div className="p-3.5 rounded-2xl bg-[#FFFAF7] border border-[#F8DDE3]/70 hover:border-[#A9C2A5] transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h5 className="font-serif text-sm font-bold text-[#3F5A44]">
                        {act.title}
                      </h5>
                      <span className="text-[11px] font-medium text-[#4A3038]/60 shrink-0">
                        {formatTimeAgo(act.timestamp)}
                      </span>
                    </div>
                    {act.description && (
                      <p className="text-xs text-[#4A3038]/80 mt-1 leading-relaxed">
                        {act.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* WEEKLY CHECK-IN: Latest check-in summary card & link to past ones */}
      <section className="space-y-4">
        <div className="border-t border-[#F8DDE3]/80 pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#3F5A44] flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-[#3F5A44]" />
                <span>Latest Weekly Check-in</span>
              </h3>
              <p className="text-xs text-[#4A3038]/70">
                Summary of your latest weekly check-in and tips
              </p>
            </div>

            {plan.weeklyCheckIns && plan.weeklyCheckIns.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPastCheckInsModal(true)}
                className="text-xs font-semibold text-[#3F5A44] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Past Check-ins ({plan.weeklyCheckIns.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {latestCheckIn ? (
          <div className="bg-white/95 rounded-3xl p-5 sm:p-6 border border-[#F8DDE3] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F8DDE3]/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#CFDDC9] text-[#3F5A44]">
                    Week {latestCheckIn.weekNumber}
                  </span>
                  <span className="text-xs font-medium text-[#4A3038]/70">
                    {latestCheckIn.dateRange}
                  </span>
                </div>
                <h4 className="font-serif text-base font-bold text-[#3F5A44] mt-1">
                  {latestCheckIn.completionRatePercent}% of tasks completed
                </h4>
              </div>

              {latestCheckIn.confidenceRating && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F8DDE3] text-[#3F5A44] border border-[#e8bac3]">
                  <span>🌸</span>
                  <span>{latestCheckIn.confidenceRating}</span>
                </span>
              )}
            </div>

            {/* Reflection quote if entered */}
            {latestCheckIn.userReflection && (
              <div className="p-3.5 rounded-2xl bg-[#FFFAF7] border border-[#F8DDE3] text-xs text-[#4A3038]/85 italic">
                "{latestCheckIn.userReflection}"
              </div>
            )}

            {/* Suggested Tweaks preview */}
            {latestCheckIn.suggestedTweaks && latestCheckIn.suggestedTweaks.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#3F5A44] uppercase tracking-wider">
                  Tips from this check-in:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {latestCheckIn.suggestedTweaks.map((tw, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-[#FFFAF7] border border-[#F8DDE3] text-xs space-y-1"
                    >
                      <span className="font-bold text-[#3F5A44] block">{tw.title}</span>
                      <p className="text-[#4A3038]/75 leading-relaxed">{tw.advice}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[#4A3038]/60">
                Completed on {formatTimeAgo(latestCheckIn.completedAt)}
              </span>
              <button
                type="button"
                onClick={() => onNavigateTab('weekly')}
                className="px-4 py-2 rounded-2xl bg-[#3F5A44] hover:bg-[#2d4231] text-[#FFFAF7] text-xs font-semibold transition cursor-pointer shadow-xs active:scale-98"
              >
                Go to Weekly Check-in
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/95 rounded-3xl p-6 border border-[#F8DDE3] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F8DDE3] text-[#3F5A44] flex items-center justify-center mx-auto shadow-2xs">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h4 className="font-serif text-base font-bold text-[#3F5A44]">
              Ready for your first weekly review?
            </h4>
            <p className="text-xs text-[#4A3038]/80 max-w-md mx-auto leading-relaxed">
              Once a week, take 2 minutes to review your progress, celebrate wins, and get 2 to 3 simple tips to stay on track.
            </p>
            <button
              onClick={() => onNavigateTab('weekly')}
              className="px-5 py-2.5 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] font-bold text-xs shadow-xs transition cursor-pointer active:scale-98"
            >
              Start Week 1 Check-in
            </button>
          </div>
        )}
      </section>

      {/* PAST CHECK-INS MODAL */}
      {showPastCheckInsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-[#FFFAF7] p-6 shadow-2xl border border-[#F8DDE3] text-[#4A3038] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#F8DDE3]">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-[#3F5A44]" />
                <h3 className="font-serif text-lg font-bold text-[#3F5A44]">
                  Past Weekly Check-ins
                </h3>
              </div>
              <button
                onClick={() => setShowPastCheckInsModal(false)}
                className="p-1 rounded-xl text-[#4A3038]/60 hover:text-[#4A3038] hover:bg-[#F8DDE3]/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {plan.weeklyCheckIns && plan.weeklyCheckIns.length > 0 ? (
                plan.weeklyCheckIns.map((ci) => (
                  <div
                    key={ci.id}
                    className="p-4 rounded-2xl bg-white border border-[#F8DDE3] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#3F5A44]">
                        Week {ci.weekNumber} ({ci.dateRange})
                      </span>
                      <span className="font-bold px-2 py-0.5 rounded-full bg-[#CFDDC9] text-[#3F5A44]">
                        {ci.completionRatePercent}% Done
                      </span>
                    </div>

                    <p className="text-[#4A3038]/80">
                      Completed {ci.tasksCompletedCount} of {ci.totalTasksScheduled} scheduled tasks.
                    </p>

                    {ci.userReflection && (
                      <div className="p-2.5 rounded-xl bg-[#FFFAF7] border border-[#F8DDE3] italic">
                        "{ci.userReflection}"
                      </div>
                    )}

                    <div className="text-[10px] text-[#4A3038]/50 pt-1">
                      Saved on {new Date(ci.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-[#4A3038]/60 py-6">
                  No past check-ins found.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-[#F8DDE3] flex justify-end">
              <button
                onClick={() => setShowPastCheckInsModal(false)}
                className="px-4 py-2 rounded-2xl bg-[#A9C2A5] text-[#3F5A44] font-bold text-xs hover:bg-[#97b393] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
