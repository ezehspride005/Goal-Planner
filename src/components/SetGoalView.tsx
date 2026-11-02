import React, { useState } from 'react';
import { ClarifyingQuestion, GoalPlan } from '../types/goal';
import { Sparkles, ArrowRight, CheckCircle2, Compass, Loader2 } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

interface SetGoalViewProps {
  onPlanGenerated: (plan: GoalPlan) => void;
  existingPlan?: GoalPlan | null;
}

const INSPIRATION_GOALS = [
  'Add 25 new distributors this year',
  'Save $24,000 for a home down payment',
  'Run my first 42km marathon',
  'Write and publish a 60,000-word book',
  'Acquire 12 high-ticket clients',
  'Read 36 transformative books',
];

export const SetGoalView: React.FC<SetGoalViewProps> = ({ onPlanGenerated, existingPlan }) => {
  const { profile, user } = useAuth();
  const userName = profile?.firstName || user?.displayName?.split(' ')[0] || '';
  const appPurpose = profile?.appPurpose || '';

  const [goalText, setGoalText] = useState(existingPlan?.yearlyGoal || '');
  const [step, setStep] = useState<'input' | 'clarifying' | 'generating'>('input');
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isGeneratingBreakdown, setIsGeneratingBreakdown] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch clarifying questions from Gemini
  const handleProceedToClarifying = async () => {
    if (!goalText.trim()) {
      setErrorMessage('Please describe your yearly goal.');
      return;
    }
    setErrorMessage(null);
    setIsLoadingQuestions(true);

    try {
      const res = await fetch('/api/goal/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearlyGoal: goalText }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate clarifying questions');
      }

      const data = await res.json();
      const loadedQuestions: ClarifyingQuestion[] = data.questions || [];
      setQuestions(loadedQuestions);

      // Initialize default answers
      const initialAnswers: Record<string, string> = {};
      loadedQuestions.forEach((q) => {
        initialAnswers[q.id] = q.defaultValue;
      });
      setAnswers(initialAnswers);
      setStep('clarifying');
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Unable to load questions. You can still generate the breakdown directly.');
      setStep('clarifying');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Generate full backward math breakdown
  const handleGenerateBreakdown = async () => {
    setIsGeneratingBreakdown(true);
    setErrorMessage(null);

    const formattedAnswers = questions.map((q) => ({
      question: q.question,
      answer: answers[q.id] || q.defaultValue,
    }));

    try {
      const res = await fetch('/api/goal/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearlyGoal: goalText,
          answers: formattedAnswers,
        }),
      });

      if (!res.ok) {
        throw new Error('Breakdown calculation failed');
      }

      const data = await res.json();

      const newPlan: GoalPlan = {
        id: `plan-${Date.now()}`,
        yearlyGoal: goalText,
        createdAt: new Date().toISOString(),
        metricName: data.metricName || 'units',
        yearlyTargetNumber: data.yearlyTargetNumber || 25,
        mathExplanation: data.mathExplanation,
        monthlyGoals: data.monthlyGoals || [],
        weeklyActions: data.weeklyActions || [],
        dailyTasks: data.dailyTasks || [],
        tokensEarned: existingPlan?.tokensEarned || 0,
        dayStreak: existingPlan?.dayStreak || 0,
        longestStreak: existingPlan?.longestStreak || existingPlan?.dayStreak || 0,
        activities: [
          {
            id: `act_${Date.now()}`,
            type: 'goal_started',
            title: 'Yearly Goal Initiated',
            description: `Committed to annual summit: "${goalText}"`,
            timestamp: new Date().toISOString(),
          },
          ...(existingPlan?.activities || []),
        ],
        history: existingPlan?.history || [],
      };

      onPlanGenerated(newPlan);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Something went wrong during breakdown. Please try again.');
    } finally {
      setIsGeneratingBreakdown(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Intro Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-[#F8DDE3] text-[#3F5A44] mb-3 shadow-xs">
          <Compass className="w-7 h-7 text-[#3F5A44]" />
        </div>
        {userName && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#CFDDC9]/70 text-[#3F5A44] text-xs font-semibold tracking-wide">
              <span>🌸</span>
              <span>Welcome, {userName}</span>
              {appPurpose && <span className="text-[#3F5A44]/70">• {appPurpose}</span>}
            </span>
          </div>
        )}
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#3F5A44] tracking-tight mb-2">
          {userName ? `${userName}'s Yearly Goal` : 'Set Your Yearly Goal'}
        </h1>
        <p className="text-sm sm:text-base text-[#4A3038]/80 max-w-lg mx-auto leading-relaxed">
          Enter one yearly goal. We will break it down into simple monthly targets, weekly actions, and daily tasks so you know exactly what to do each day to reach it.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Step 1: Input Goal */}
      {step === 'input' && (
        <div className="bg-white/80 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border border-[#F8DDE3] shadow-sm space-y-6">
          <div>
            <label htmlFor="goalInput" className="block text-sm font-semibold text-[#3F5A44] mb-2">
              What is your single yearly goal?
            </label>
            <textarea
              id="goalInput"
              rows={3}
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              placeholder="e.g. Add 25 new distributors this year"
              className="w-full p-4 rounded-2xl border border-[#3F5A44]/20 focus:border-[#3F5A44] focus:ring-2 focus:ring-[#F8DDE3] outline-hidden text-[#4A3038] placeholder:text-[#4A3038]/40 bg-[#FFFAF7]/60 text-base resize-none transition"
            />
          </div>

          {/* Inspiration chips */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#3F5A44]/70 mb-2.5">
              Or choose an example goal:
            </p>
            <div className="flex flex-wrap gap-2">
              {INSPIRATION_GOALS.map((insp) => (
                <button
                  key={insp}
                  type="button"
                  onClick={() => setGoalText(insp)}
                  className={`text-xs px-3.5 py-2 rounded-xl transition cursor-pointer text-left ${
                    goalText === insp
                      ? 'bg-[#3F5A44] text-[#FFFAF7] font-medium shadow-xs'
                      : 'bg-[#F8DDE3]/50 text-[#4A3038] hover:bg-[#F8DDE3]'
                  }`}
                >
                  {insp}
                </button>
              ))}
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={handleProceedToClarifying}
              disabled={isLoadingQuestions || !goalText.trim()}
              className="w-full min-h-[52px] rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] disabled:opacity-50 text-[#3F5A44] font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
            >
              {isLoadingQuestions ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#3F5A44]" />
                  <span>Preparing a few quick questions...</span>
                </>
              ) : (
                <>
                  <span>Next: Answer a Few Questions</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                const samplePlan: GoalPlan = {
                  id: `plan-distributors-${Date.now()}`,
                  yearlyGoal: 'Add 25 new distributors this year',
                  createdAt: new Date().toISOString(),
                  metricName: 'distributors',
                  yearlyTargetNumber: 25,
                  mathExplanation: {
                    yearlyTargetText: 'Recruit and onboard 25 committed distributors over the next 12 months.',
                    formulaSummary: '25 distributors ÷ 0.05 conversion rate = 500 conversations ÷ 50 weeks = 10 conversations per week = 2 conversations per weekday.',
                    monthlyBreakdownExplanation: 'To reach 25 distributors, 11 months aim for 2 new distributors and 1 month aims for 3 new distributors, adding up to 25 distributors across the year.',
                    dailyCommitmentExplanation: 'Having 2 conversations every weekday gives you 10 conversations per week, which reliably leads to 2 new signed distributors every month.',
                  },
                  monthlyGoals: [
                    { id: 'm-1', monthIndex: 1, monthName: 'January', targetValue: 2, originalTargetValue: 2, currentValue: 1, unit: 'distributors', milestoneTitle: 'Start Outreach & Sign 2 Partners', keyFocus: 'Reach out to warm contacts.', isCustomAdded: false },
                    { id: 'm-2', monthIndex: 2, monthName: 'February', targetValue: 2, originalTargetValue: 2, currentValue: 0, unit: 'distributors', milestoneTitle: 'Keep Pipeline Steady & Sign 2 Partners', keyFocus: 'Follow up and help new signups get started.', isCustomAdded: false },
                    { id: 'm-3', monthIndex: 3, monthName: 'March', targetValue: 2, originalTargetValue: 2, currentValue: 0, unit: 'distributors', milestoneTitle: 'Finish Q1 with 6 Total Partners', keyFocus: 'Improve conversation quality.', isCustomAdded: false },
                    { id: 'm-4', monthIndex: 4, monthName: 'April', targetValue: 2, originalTargetValue: 2, currentValue: 0, unit: 'distributors', milestoneTitle: 'Sign 2 New Partners in Spring', keyFocus: 'Ask for referrals and grow network.', isCustomAdded: false },
                    { id: 'm-5', monthIndex: 5, monthName: 'May', targetValue: 2, originalTargetValue: 2, currentValue: 0, unit: 'distributors', milestoneTitle: 'Reach 10 Total Partners', keyFocus: 'Refine presentation and answer common questions.', isCustomAdded: false },
                    { id: 'm-6', monthIndex: 6, monthName: 'June', targetValue: 2, originalTargetValue: 2, currentValue: 0, unit: 'distributors', milestoneTitle: 'Hit Mid-Year Halfway Mark (12 Total)', keyFocus: 'Mid-year check and celebration.', isCustomAdded: false },
                    { id: 'm-7', monthIndex: 7, monthName: 'July', targetValue: 2, originalTargetValue: 2, currentValue: 0, unit: 'distributors', milestoneTitle: 'Summer Momentum: 2 New Signups', keyFocus: 'Online info sessions.', isCustomAdded: false },
                    { id: 'm-8', monthIndex: 8, monthName: 'August', targetValue: 2, originalTargetValue: 2, currentValue: 0, unit: 'distributors', milestoneTitle: 'Reach 16 Total Partners', keyFocus: 'Share success stories.', isCustomAdded: false },
                    { id: 'm-9', monthIndex: 9, monthName: 'September', targetValue: 2, originalTargetValue: 2, currentValue: 0, unit: 'distributors', milestoneTitle: 'Fall Kick-Off: 2 New Signups', keyFocus: 'Re-contact previous leads.', isCustomAdded: false },
                    { id: 'm-10', monthIndex: 10, monthName: 'October', targetValue: 2, originalTargetValue: 2, currentValue: 0, unit: 'distributors', milestoneTitle: 'Reach 20 Total Partners', keyFocus: 'Look for experienced partners.', isCustomAdded: false },
                    { id: 'm-11', monthIndex: 11, monthName: 'November', targetValue: 2, originalTargetValue: 2, currentValue: 0, unit: 'distributors', milestoneTitle: 'Sign 2 Partners Before the Holidays', keyFocus: 'Early new-year planning.', isCustomAdded: false },
                    { id: 'm-12', monthIndex: 12, monthName: 'December', targetValue: 3, originalTargetValue: 3, currentValue: 0, unit: 'distributors', milestoneTitle: 'Finish Strong with 3 Signups (25 Total)', keyFocus: 'Year-end push.', isCustomAdded: false },
                  ],
                  weeklyActions: [
                    { id: 'w1', title: 'Hold presentations or discovery chats', targetPerWeek: 10, unit: 'chats', whyItMatters: '10 chats a week lead to 2 signups every month.' },
                    { id: 'w2', title: 'Send friendly invitations to potential partners', targetPerWeek: 25, unit: 'invitations', whyItMatters: 'Produces the 10 chats you need each week.' },
                    { id: 'w3', title: 'Follow up with interested contacts', targetPerWeek: 15, unit: 'follow-ups', whyItMatters: 'Most people join after a follow-up.' },
                  ],
                  dailyTasks: [
                    { id: 'd1', title: 'Have 2 opportunity chats or discovery calls', category: 'Conversations', dailyQuota: 2, unit: 'calls', completed: false, mathTracing: '2 calls/day x 5 weekdays = 10 calls/week x 50 weeks = 500 calls. At a 5% join rate, that is 25 new partners.' },
                    { id: 'd2', title: 'Send 5 personalized invitations to good prospects', category: 'Outreach', dailyQuota: 5, unit: 'invitations', completed: false, mathTracing: '5 invitations/day x 5 days = 25 invitations/week, booking 10 chats every week.' },
                    { id: 'd3', title: 'Follow up with 3 contacts who showed interest', category: 'Follow-ups', dailyQuota: 3, unit: 'follow-ups', completed: false, mathTracing: '3 follow-ups/day x 5 days = 15 follow-ups/week, keeping your pipeline active.' },
                  ],
                  majorMilestones: [
                    { id: 'ms-q1', title: 'Q1 Foundation', targetMonth: 3, targetCumulativeValue: 6, badgeIcon: '🌱', badgeName: 'Bronze Sprout', description: 'Reach 6 partners and find your rhythm.' },
                    { id: 'ms-q2', title: 'Halfway Checkpoint', targetMonth: 6, targetCumulativeValue: 12, badgeIcon: '🌸', badgeName: 'Silver Blossom', description: 'Cross the halfway mark with 12 total partners.' },
                    { id: 'ms-q3', title: 'Q3 Acceleration', targetMonth: 9, targetCumulativeValue: 18, badgeIcon: '🌿', badgeName: 'Golden Bloom', description: 'Hit 18 partners heading into the final stretch.' },
                    { id: 'ms-q4', title: 'Yearly Goal Finish', targetMonth: 12, targetCumulativeValue: 25, badgeIcon: '👑', badgeName: 'Summit Crown', description: 'Reach all 25 partners for the year!' },
                  ],
                  tokensEarned: 2,
                  dayStreak: 2,
                  history: [],
                };
                onPlanGenerated(samplePlan);
              }}
              className="w-full py-2.5 rounded-2xl border border-[#3F5A44]/20 hover:bg-[#F8DDE3]/40 text-[#3F5A44] font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#A9C2A5]" />
              <span>Try an Example: Add 25 new distributors</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Clarifying Questions */}
      {step === 'clarifying' && (
        <div className="bg-white/80 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border border-[#F8DDE3] shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#F8DDE3]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#A9C2A5]">Step 2 of 2</span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#3F5A44]">
                A Few Quick Details
              </h2>
            </div>
            <button
              onClick={() => setStep('input')}
              className="text-xs text-[#3F5A44]/70 hover:text-[#3F5A44] underline"
            >
              Change Goal
            </button>
          </div>

          <p className="text-xs sm:text-sm text-[#4A3038]/80 leading-relaxed">
            To build a plan that fits your schedule, please answer these quick questions for <strong>"{goalText}"</strong>:
          </p>

          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-4 sm:p-5 rounded-2xl bg-[#FFFAF7] border border-[#F8DDE3]">
                <div className="flex items-start gap-2.5 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F8DDE3] text-xs font-bold text-[#3F5A44]">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-medium text-sm sm:text-base text-[#4A3038]">
                      {q.question}
                    </h3>
                    {q.hint && <p className="text-xs text-[#4A3038]/60 mt-0.5">{q.hint}</p>}
                  </div>
                </div>

                {/* Quick Options */}
                {q.quickOptions && q.quickOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 my-3 pl-8">
                    {q.quickOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                          answers[q.id] === opt
                            ? 'bg-[#3F5A44] border-[#3F5A44] text-[#FFFAF7] font-medium'
                            : 'bg-white border-[#F8DDE3] text-[#4A3038] hover:bg-[#F8DDE3]/40'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom Input */}
                <div className="pl-8">
                  <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder={q.defaultValue}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#3F5A44]/20 focus:border-[#3F5A44] text-sm text-[#4A3038] bg-white outline-hidden"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleGenerateBreakdown}
              disabled={isGeneratingBreakdown}
              className="w-full min-h-[52px] rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] disabled:opacity-50 text-[#3F5A44] font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
            >
              {isGeneratingBreakdown ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#3F5A44]" />
                  <span>Creating your goal plan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-[#3F5A44]" />
                  <span>Create My Goal Plan</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
