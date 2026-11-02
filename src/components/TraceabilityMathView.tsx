import React from 'react';
import { GoalPlan } from '../types/goal';
import { Target, Calendar, CheckSquare, Layers, Sparkles, TrendingUp } from 'lucide-react';

interface TraceabilityMathViewProps {
  plan: GoalPlan;
}

export const TraceabilityMathView: React.FC<TraceabilityMathViewProps> = ({ plan }) => {
  const { mathExplanation, weeklyActions, dailyTasks, monthlyGoals } = plan;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-[#F8DDE3]">
        <div className="flex items-center gap-2">
          <Layers className="w-6 h-6 text-[#3F5A44]" />
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#3F5A44]">
            How the Math Works
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#4A3038]/75 mt-1">
          How your small daily tasks add up step by step to reach your big yearly goal.
        </p>
      </div>

      {/* Primary Mathematical Formula Card */}
      <div className="p-6 rounded-3xl bg-white/90 border border-[#F8DDE3] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#F8DDE3] text-xs font-bold text-[#3F5A44]">
            The Simple Formula
          </span>
        </div>

        <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#3F5A44]">
          {mathExplanation?.yearlyTargetText || plan.yearlyGoal}
        </h3>

        <div className="p-4 rounded-2xl bg-[#FFFAF7] border border-[#F8DDE3] text-sm text-[#4A3038] leading-relaxed space-y-2">
          <div className="font-semibold text-[#3F5A44] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#A9C2A5]" />
            <span>How it adds up:</span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-[#4A3038]/90">
            {mathExplanation?.formulaSummary ||
              `Your goal of ${plan.yearlyTargetNumber} is divided across 12 monthly targets. Completing your small daily tasks keeps you right on schedule without needing to rush.`}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-[#F8DDE3]/40 border border-[#F8DDE3]">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#3F5A44] mb-1">
              Monthly Targets Rule
            </h4>
            <p className="text-xs text-[#4A3038]/80 leading-relaxed">
              {mathExplanation?.monthlyBreakdownExplanation ||
                'Monthly goals cannot be lowered or deleted. You can only raise them or add extra goals on top.'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#CFDDC9]/40 border border-[#A9C2A5]/60">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#3F5A44] mb-1">
              Daily Habit
            </h4>
            <p className="text-xs text-[#4A3038]/80 leading-relaxed">
              {mathExplanation?.dailyCommitmentExplanation ||
                'Finish each day’s checklist to reach your goal comfortably without stressful last-minute catching up.'}
            </p>
          </div>
        </div>
      </div>

      {/* 4-Tier Hierarchy */}
      <div className="space-y-4">
        <h3 className="font-serif text-xl font-bold text-[#3F5A44]">
          From Big Goal to Daily Steps
        </h3>

        {/* Tier 1: Yearly */}
        <div className="p-5 rounded-3xl bg-white/90 border border-[#F8DDE3] flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#3F5A44] text-[#FFFAF7] flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3F5A44]/70">Step 1 • Your Yearly Goal</span>
            <h4 className="font-serif text-lg font-bold text-[#3F5A44]">{plan.yearlyGoal}</h4>
            <p className="text-xs text-[#4A3038]/70 mt-0.5">Your main finish line for the entire year.</p>
          </div>
        </div>

        {/* Tier 2: Monthly Targets */}
        <div className="p-5 rounded-3xl bg-white/90 border border-[#F8DDE3] flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#A9C2A5] text-[#3F5A44] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3F5A44]/70">Step 2 • 12 Monthly Goals</span>
            <h4 className="font-serif text-lg font-bold text-[#3F5A44]">Fixed Monthly Targets</h4>
            <p className="text-xs text-[#4A3038]/70 mt-0.5 mb-2">
              Fixed for every month. You can raise a target or add extra goals, but cannot lower them.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {monthlyGoals.slice(0, 6).map((m) => (
                <span key={m.id} className="text-[11px] px-2 py-0.5 rounded-lg bg-[#F8DDE3]/60 text-[#4A3038]">
                  {m.monthName}: {m.targetValue} {m.unit}
                </span>
              ))}
              {monthlyGoals.length > 6 && (
                <span className="text-[11px] px-2 py-0.5 rounded-lg bg-[#F8DDE3]/30 text-[#4A3038]/70">
                  +{monthlyGoals.length - 6} more months
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tier 3: Weekly Actions */}
        <div className="p-5 rounded-3xl bg-white/90 border border-[#F8DDE3] flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#F8DDE3] text-[#3F5A44] flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3F5A44]/70">Step 3 • Weekly Habits</span>
            <h4 className="font-serif text-lg font-bold text-[#3F5A44]">Weekly Actions</h4>
            <p className="text-xs text-[#4A3038]/70 mt-0.5 mb-3">
              What you need to complete each week to hit your monthly goals.
            </p>
            <div className="space-y-2">
              {weeklyActions.map((w) => (
                <div key={w.id} className="p-3 rounded-2xl bg-[#FFFAF7] border border-[#F8DDE3]/60 text-xs">
                  <div className="flex justify-between font-semibold text-[#3F5A44]">
                    <span>{w.title}</span>
                    <span className="text-[#3F5A44] bg-[#A9C2A5]/30 px-2 py-0.5 rounded-md">
                      {w.targetPerWeek} {w.unit} / week
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4A3038]/70 mt-1">{w.whyItMatters}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tier 4: Daily To-Do Checklist */}
        <div className="p-5 rounded-3xl bg-[#F8DDE3]/60 border border-[#F8DDE3] flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#CFDDC9] text-[#3F5A44] flex items-center justify-center shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3F5A44]/70">Step 4 • Daily Tasks</span>
            <h4 className="font-serif text-lg font-bold text-[#3F5A44]">Today's Checklist</h4>
            <p className="text-xs text-[#4A3038]/70 mt-0.5 mb-3">
              Clear, bite-sized tasks to tick off each day.
            </p>
            <div className="space-y-2">
              {dailyTasks.map((d) => (
                <div key={d.id} className="p-3 rounded-2xl bg-white border border-[#F8DDE3] text-xs">
                  <div className="flex justify-between font-semibold text-[#4A3038]">
                    <span>{d.title}</span>
                    <span className="font-bold text-[#3F5A44]">
                      {d.dailyQuota} {d.unit}/day
                    </span>
                  </div>
                  <p className="text-[11px] text-[#3F5A44]/80 mt-1">{d.mathTracing}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
