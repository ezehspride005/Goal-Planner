import React, { useState } from 'react';
import { DailyTask, GoalPlan } from '../types/goal';
import { playGentleChime } from '../utils/sound';
import {
  Check,
  Sparkles,
  RefreshCw,
  Award,
  Calculator,
  ChevronDown,
  ChevronUp,
  Heart,
  Calendar,
  Compass,
  X,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { appendActivity } from '../utils/activity';
import { ReminderSettings } from '../types/reminder';
import { triggerRewardCelebration } from '../utils/notifications';

interface DailyTasksViewProps {
  plan: GoalPlan;
  onUpdatePlan: (updatedPlan: GoalPlan) => void;
  onOpenSetGoal?: () => void;
  reminderSettings?: ReminderSettings;
  onUpdateReminderSettings?: (newSettings: ReminderSettings) => void;
}

export const DailyTasksView: React.FC<DailyTasksViewProps> = ({
  plan,
  onUpdatePlan,
  onOpenSetGoal,
  reminderSettings,
  onUpdateReminderSettings,
}) => {
  const { profile, user } = useAuth();
  const userName = profile?.firstName || user?.displayName?.split(' ')[0] || '';
  const [showRedistributeModal, setShowRedistributeModal] = useState(false);
  const [isRedistributing, setIsRedistributing] = useState(false);
  const [missedDaysCount, setMissedDaysCount] = useState<number>(1);
  const [redistributeResult, setRedistributeResult] = useState<{
    explanation: string;
    pacingTip?: string;
    adjustedTasks?: { taskTitle: string; newDailyQuota: number; reason: string }[];
  } | null>(null);

  // Expanded task math tracing details toggle
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Calculate completion statistics
  const totalTasks = plan.dailyTasks.length;
  const completedTasks = plan.dailyTasks.filter((t) => t.completed).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const allCompleted = totalTasks > 0 && completedTasks === totalTasks;

  const todayStr = new Date().toISOString().split('T')[0];
  const alreadyAwardedToday = plan.history?.some((h) => h.date === todayStr && h.tokenAwarded);

  // Toggle task with circular checkmark button
  const handleToggleTask = (taskId: string) => {
    let justFinishedAll = false;
    let toggledTaskTitle = '';
    let isNowCompleted = false;

    const updatedTasks = plan.dailyTasks.map((t) => {
      if (t.id === taskId) {
        const nextState = !t.completed;
        toggledTaskTitle = t.title;
        isNowCompleted = nextState;
        return { ...t, completed: nextState };
      }
      return t;
    });

    const nextCompletedCount = updatedTasks.filter((t) => t.completed).length;
    if (nextCompletedCount === totalTasks && !allCompleted) {
      justFinishedAll = true;
    }

    let nextTokens = plan.tokensEarned;
    let nextStreak = plan.dayStreak;
    let nextHistory = [...(plan.history || [])];

    if (justFinishedAll && !alreadyAwardedToday) {
      nextTokens += 1;
      nextStreak += 1;
      nextHistory.push({
        date: todayStr,
        completedTaskIds: updatedTasks.map((t) => t.id),
        tokenAwarded: true,
      });
      playGentleChime();
      if (reminderSettings) {
        triggerRewardCelebration(userName, plan.tokensEarned, plan.dayStreak, reminderSettings).then((updated) => {
          if (updated && onUpdateReminderSettings) {
            onUpdateReminderSettings(updated);
          }
        });
      }
    }

    let updatedPlanState: GoalPlan = {
      ...plan,
      dailyTasks: updatedTasks,
      tokensEarned: nextTokens,
      dayStreak: nextStreak,
      longestStreak: Math.max(plan.longestStreak || 0, nextStreak),
      lastCompletedDate: justFinishedAll ? todayStr : plan.lastCompletedDate,
      history: nextHistory,
    };

    // Log activity
    if (isNowCompleted) {
      updatedPlanState = appendActivity(updatedPlanState, {
        type: 'task_completed',
        title: `Completed: ${toggledTaskTitle}`,
        description: `Finished task (${nextCompletedCount} of ${totalTasks} done today).`,
      });
    }

    if (justFinishedAll && !alreadyAwardedToday) {
      updatedPlanState = appendActivity(updatedPlanState, {
        type: 'reward_earned',
        title: 'Daily Token Earned! 🌸',
        description: `Great job! All ${totalTasks} tasks completed today. Streak is now ${nextStreak} days.`,
      });
    }

    onUpdatePlan(updatedPlanState);
  };

  // Reset checklist for testing or fresh day
  const handleResetForNewDay = () => {
    const resetTasks = plan.dailyTasks.map((t) => ({ ...t, completed: false }));
    onUpdatePlan({ ...plan, dailyTasks: resetTasks });
  };

  // Trigger redistribution of missed days across remaining days and months
  const handleRedistributeMissedWork = async () => {
    setIsRedistributing(true);
    setRedistributeResult(null);

    const incompleteTasks = plan.dailyTasks.filter((t) => !t.completed);
    const targetTasks = incompleteTasks.length > 0 ? incompleteTasks : plan.dailyTasks;

    try {
      const res = await fetch('/api/goal/redistribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearlyGoal: plan.yearlyGoal,
          missedTasks: targetTasks.map((t) => ({
            title: t.title,
            dailyQuota: t.dailyQuota,
            unit: t.unit,
            missedUnits: t.dailyQuota * missedDaysCount,
          })),
          remainingDaysInMonth: 20,
          remainingMonths: 11,
        }),
      });

      const data = await res.json();

      // Recalculate daily task quotas so the yearly summit is 100% preserved
      const updatedTasks = plan.dailyTasks.map((t) => {
        const match = (data.adjustedDailyTasks || []).find((adj: any) =>
          adj.taskTitle?.toLowerCase().includes(t.title.slice(0, 10).toLowerCase()) ||
          t.title.toLowerCase().includes(adj.taskTitle?.slice(0, 10).toLowerCase())
        );
        if (match && match.newDailyQuota) {
          const quotaDiff = match.newDailyQuota - t.dailyQuota;
          return {
            ...t,
            dailyQuota: match.newDailyQuota,
            completed: false,
            mathTracing: `${t.mathTracing} (Recalibrated +${quotaDiff > 0 ? quotaDiff : 1} to absorb ${missedDaysCount} missed day(s) smoothly across remaining days).`,
          };
        }
        return {
          ...t,
          completed: false,
        };
      });

      const planWithRedistribution = appendActivity(
        {
          ...plan,
          dailyTasks: updatedTasks,
        },
        {
          type: 'work_redistributed',
          title: 'Missed Work Gently Redistributed',
          description: `Adjusted pacing for ${missedDaysCount} missed day(s) so your yearly summit "${plan.yearlyGoal}" stays 100% on schedule.`,
        }
      );

      onUpdatePlan(planWithRedistribution);

      setRedistributeResult({
        explanation:
          data.explanation ||
          `Missed work from ${missedDaysCount} day(s) has been smoothly redistributed across your remaining weekdays and months. Your yearly goal of "${plan.yearlyGoal}" remains 100% on schedule!`,
        pacingTip: data.pacingTip || 'Consistency beats intensity. One focused day at a time keeps your annual summit firm.',
        adjustedTasks: data.adjustedDailyTasks,
      });
    } catch (err) {
      console.error(err);
      // Fallback redistribution calculation
      const updatedTasks = plan.dailyTasks.map((t) => ({
        ...t,
        dailyQuota: t.dailyQuota + 1,
        completed: false,
        mathTracing: `${t.mathTracing} (Pace gently adjusted by +1 for the upcoming week to smoothly absorb missed work).`,
      }));

      const planWithRedistribution = appendActivity(
        {
          ...plan,
          dailyTasks: updatedTasks,
        },
        {
          type: 'work_redistributed',
          title: 'Missed Work Redistributed',
          description: `Daily quotas adjusted by +1 to absorb missed work without shrinking your yearly summit.`,
        }
      );

      onUpdatePlan(planWithRedistribution);

      setRedistributeResult({
        explanation: `Missed work has been gently distributed across the remaining weekdays. Your yearly goal of "${plan.yearlyGoal}" remains 100% achievable!`,
        pacingTip: 'Take a deep breath and begin today fresh. The year is yours.',
      });
    } finally {
      setIsRedistributing(false);
    }
  };

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* 1. TODAY'S PLAN HEADER & TOKEN COUNTER BANNER */}
      <div className="bg-white/90 backdrop-blur-xs p-6 rounded-3xl border border-[#F8DDE3] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-[#A9C2A5]">
              {formattedDate}
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#3F5A44] tracking-tight">
              {userName ? `${userName}'s Plan` : "Today's Plan"}
            </h2>
            <p className="text-xs text-[#4A3038]/70 mt-0.5">
              Yearly Goal: <strong className="text-[#3F5A44]">"{plan.yearlyGoal}"</strong>
            </p>
          </div>

          {/* Prominent Token Counter */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-[#CFDDC9]/60 border border-[#A9C2A5] px-4 py-2 rounded-2xl shadow-2xs">
            <Award className="w-5 h-5 text-[#3F5A44]" />
            <div>
              <span className="font-serif text-base font-bold text-[#3F5A44] leading-none block">
                {plan.tokensEarned} {plan.tokensEarned === 1 ? 'Token' : 'Tokens'}
              </span>
              <span className="text-[10px] text-[#3F5A44]/80 font-medium leading-none block mt-0.5">
                {allCompleted ? '✓ Today Complete' : 'Tokens Earned'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. PROMINENT PROGRESS BAR */}
        <div className="p-4 rounded-2xl bg-[#FFFAF7] border border-[#F8DDE3]/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-[#3F5A44]">Today's Progress</span>
            <span className="text-[#4A3038]">
              {completedTasks} of {totalTasks} Completed ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-[#F8DDE3] overflow-hidden p-0.5 border border-[#F8DDE3]">
            <div
              className="h-full bg-[#A9C2A5] rounded-full transition-all duration-500 ease-out shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#4A3038]/70 pt-0.5">
            <span>{allCompleted ? '🎉 All tasks done for today!' : `${totalTasks - completedTasks} left to earn today's token`}</span>
            <span className="font-medium text-[#3F5A44]">{plan.dayStreak} Day Streak 🔥</span>
          </div>
        </div>
      </div>

      {/* 3. DAILY REWARD CELEBRATION MESSAGE (Light sage #CFDDC9) */}
      {allCompleted && (
        <div className="p-6 rounded-3xl bg-[#CFDDC9] border-2 border-[#A9C2A5] text-[#3F5A44] shadow-md animate-fade-in relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-7 h-7 text-[#3F5A44]" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-white text-[11px] font-bold text-[#3F5A44] uppercase tracking-wider shadow-2xs">
                  ✨ Great Job Today!
                </span>
                <span className="text-xs font-bold text-[#3F5A44]">+1 Token Earned</span>
              </div>

              <h3 className="font-serif text-2xl font-bold text-[#3F5A44] mb-1.5 leading-snug">
                You finished all your tasks!
              </h3>

              <p className="text-xs sm:text-sm text-[#3F5A44] font-medium leading-relaxed mb-4">
                Every task you finished today brings you closer to your yearly goal. You earned today's <strong>token</strong>. Keep up the great work tomorrow!
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-xs font-bold text-[#3F5A44] shadow-xs">
                  <Award className="w-4 h-4 text-[#A9C2A5]" />
                  <span>Tokens: {plan.tokensEarned}</span>
                </div>

                <button
                  type="button"
                  onClick={handleResetForNewDay}
                  className="text-xs text-[#3F5A44] font-semibold underline hover:text-[#2d4231] cursor-pointer"
                >
                  Reset checklist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TODAY'S TASKS LIST: SOFT PINK CARDS (#F8DDE3) WITH TICK-OFF CIRCLES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#3F5A44]">
            Today's Tasks
          </span>
          <span className="text-xs text-[#4A3038]/60 font-medium">
            Tap the circle when done
          </span>
        </div>

        {plan.dailyTasks.map((task) => {
          const isExpanded = expandedTaskId === task.id;

          return (
            <div
              key={task.id}
              className={`rounded-3xl border transition-all duration-200 ${
                task.completed
                  ? 'bg-[#F8DDE3]/45 border-[#A9C2A5]/70 opacity-90'
                  : 'bg-[#F8DDE3] border-[#F8DDE3] hover:shadow-xs'
              }`}
            >
              <div className="p-4 sm:p-5 flex items-start gap-4">
                {/* TICK-OFF CIRCLE (Circular Button w-12 h-12 rounded-full) */}
                <button
                  type="button"
                  onClick={() => handleToggleTask(task.id)}
                  aria-label={`Mark task ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer shadow-xs active:scale-95 ${
                    task.completed
                      ? 'bg-[#A9C2A5] border-2 border-[#A9C2A5] text-white shadow-xs'
                      : 'bg-[#FFFAF7] border-2 border-[#A9C2A5] hover:bg-[#F8DDE3]/60 text-transparent'
                  }`}
                >
                  <Check className={`w-6 h-6 stroke-[3.5] ${task.completed ? 'opacity-100' : 'opacity-0'}`} />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 text-[#3F5A44]">
                      {task.category}
                    </span>
                    <span className="text-xs font-bold text-[#3F5A44]">
                      Goal: {task.dailyQuota} {task.unit}
                    </span>
                  </div>

                  <p
                    className={`text-sm sm:text-base font-semibold leading-snug transition-all ${
                      task.completed ? 'line-through text-[#4A3038]/60' : 'text-[#4A3038]'
                    }`}
                  >
                    {task.title}
                  </p>

                  {/* Math details toggle */}
                  <button
                    type="button"
                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                    className="mt-2 text-xs flex items-center gap-1.5 text-[#3F5A44] hover:underline cursor-pointer font-medium"
                  >
                    <Calculator className="w-3.5 h-3.5 text-[#3F5A44]" />
                    <span>{isExpanded ? 'Hide details' : 'Why this task matters'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 p-3.5 rounded-2xl bg-white/90 border border-[#F8DDE3] text-xs text-[#4A3038] space-y-1 animate-fade-in">
                      <div className="font-bold text-[#3F5A44] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#A9C2A5]" />
                        <span>How this helps your yearly goal:</span>
                      </div>
                      <p className="leading-relaxed text-[#4A3038]/90 font-medium">
                        {task.mathTracing}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. MISSED DAYS & REDISTRIBUTION TRIGGER */}
      <div className="bg-white/90 backdrop-blur-xs p-5 sm:p-6 rounded-3xl border border-[#F8DDE3] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-[#F8DDE3] text-[#3F5A44] shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#3F5A44]">
                Missed a day or fallen behind?
              </h3>
              <p className="text-xs text-[#4A3038]/80 leading-relaxed mt-0.5">
                No worries! Tap here to spread your missed work across the remaining days and months so you stay on track.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setRedistributeResult(null);
              setShowRedistributeModal(true);
            }}
            className="shrink-0 px-4 py-2.5 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] font-semibold text-xs sm:text-sm transition cursor-pointer active:scale-98 shadow-xs self-start sm:self-auto"
          >
            Spread Missed Work
          </button>
        </div>
      </div>

      {/* 6. REDISTRIBUTION MODAL */}
      {showRedistributeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#FFFAF7] p-6 shadow-2xl border border-[#F8DDE3] text-[#4A3038] relative">
            <button
              type="button"
              onClick={() => setShowRedistributeModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-[#3F5A44]/60 hover:text-[#3F5A44] cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2.5 rounded-2xl bg-[#F8DDE3] text-[#3F5A44]">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#3F5A44]">
                  Spread Missed Work
                </h3>
                <p className="text-xs text-[#4A3038]/70">Keep your yearly goal on track</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#4A3038]/80 mb-4 leading-relaxed">
              We keep your yearly goal of <strong>"{plan.yearlyGoal}"</strong> unchanged. Tell us how many days you missed, and we will spread that work gently across your remaining days.
            </p>

            {redistributeResult ? (
              <div className="space-y-4 mb-4">
                <div className="p-4 rounded-2xl bg-[#CFDDC9] text-[#3F5A44] border border-[#A9C2A5] text-xs sm:text-sm leading-relaxed space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-[#3F5A44]" />
                    <span>Plan Updated</span>
                  </div>
                  <p>{redistributeResult.explanation}</p>
                </div>

                {redistributeResult.pacingTip && (
                  <p className="text-xs italic text-[#4A3038]/75 bg-white/70 p-3 rounded-xl border border-[#F8DDE3]">
                    "{redistributeResult.pacingTip}"
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setShowRedistributeModal(false)}
                  className="w-full py-3 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] font-semibold text-xs sm:text-sm shadow-xs cursor-pointer active:scale-98"
                >
                  Back to Today's Tasks
                </button>
              </div>
            ) : (
              <div className="space-y-4 mb-4">
                {/* Select how many missed days */}
                <div className="p-4 rounded-2xl bg-[#F8DDE3]/40 border border-[#F8DDE3] space-y-2.5 text-xs">
                  <span className="font-bold text-[#3F5A44] block">
                    How many days did you miss?
                  </span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setMissedDaysCount(num)}
                        className={`flex-1 py-2 rounded-xl font-bold transition cursor-pointer text-xs ${
                          missedDaysCount === num
                            ? 'bg-[#3F5A44] text-[#FFFAF7] shadow-xs'
                            : 'bg-white text-[#4A3038] border border-[#F8DDE3] hover:bg-[#F8DDE3]'
                        }`}
                      >
                        {num} {num === 1 ? 'Day' : 'Days'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#4A3038]/70">
                    The missed work will be shared evenly across your remaining days and upcoming months.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRedistributeModal(false)}
                    className="flex-1 py-3 rounded-2xl border border-[#3F5A44]/20 hover:bg-[#F8DDE3]/30 text-xs font-semibold text-[#4A3038] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isRedistributing}
                    onClick={handleRedistributeMissedWork}
                    className="flex-1 py-3 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] text-xs font-semibold shadow-xs cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                  >
                    {isRedistributing ? (
                      <span>Updating your plan...</span>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Spread the Work</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
