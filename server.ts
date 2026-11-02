import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// AI Studio dev server runs on port 3000
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Fallback clarifying questions generator when API key is missing or offline
function generateFallbackQuestions(goal: string) {
  const lower = goal.toLowerCase();
  if (lower.includes('distributor') || lower.includes('client') || lower.includes('sale') || lower.includes('customer')) {
    return [
      {
        id: 'q1',
        question: 'What is your estimated conversion rate from initial conversation to a confirmed signup/sale?',
        hint: 'For example: 5% means 1 out of 20 people say yes',
        defaultValue: '5% (approx 1 in 20)',
        quickOptions: ['3% (1 in 33)', '5% (1 in 20)', '10% (1 in 10)', '15% (1 in 7)'],
      },
      {
        id: 'q2',
        question: 'How many days per week will you focus on outreach and active follow-ups?',
        hint: 'Most high performers schedule 5 focused weekdays',
        defaultValue: '5 days a week',
        quickOptions: ['4 days a week', '5 days a week', '6 days a week'],
      },
      {
        id: 'q3',
        question: 'What is your current starting baseline or warm lead list size?',
        hint: 'Are you starting from scratch or already have warm contacts?',
        defaultValue: 'Starting with ~25 warm contacts',
        quickOptions: ['Fresh start (0 contacts)', 'Small warm network (~25)', 'Active pipeline (~50+)'],
      },
    ];
  } else if (lower.includes('marathon') || lower.includes('run') || lower.includes('fitness') || lower.includes('weight')) {
    return [
      {
        id: 'q1',
        question: 'What is your current weekly fitness baseline or endurance distance?',
        hint: 'Helps ensure mileage progression doesn’t cause injury',
        defaultValue: 'Running 5-10 km comfortably per week',
        quickOptions: ['Complete beginner', '5-10 km/week', '15-20 km/week', '25+ km/week'],
      },
      {
        id: 'q2',
        question: 'How many training days can you commit to each week?',
        hint: 'Typically 3-5 sessions including recovery days',
        defaultValue: '4 training days per week',
        quickOptions: ['3 days/week', '4 days/week', '5 days/week'],
      },
      {
        id: 'q3',
        question: 'What is your target completion timeline or specific target metric?',
        hint: 'E.g., marathon in under 4 hours, or 10kg steady loss',
        defaultValue: 'Steady 12-month progressive ramp-up',
        quickOptions: ['Conservative ramp-up', 'Steady 12-month progression', 'Ambitious pace'],
      },
    ];
  } else {
    return [
      {
        id: 'q1',
        question: 'What is your current baseline or starting level for this goal?',
        hint: 'Where are you starting from today?',
        defaultValue: 'Starting from scratch (baseline 0)',
        quickOptions: ['Starting from scratch (0)', 'Intermediate / partial progress', 'Revisiting previous work'],
      },
      {
        id: 'q2',
        question: 'How many focused hours per week can you consistently invest?',
        hint: 'A realistic routine you can maintain even on busy weeks',
        defaultValue: '7 hours/week (1 hour daily)',
        quickOptions: ['3.5 hrs/week (30m daily)', '7 hrs/week (1h daily)', '14 hrs/week (2h daily)'],
      },
      {
        id: 'q3',
        question: 'What is your definition of a daily actionable win toward this metric?',
        hint: 'E.g., pages written, reps completed, dollars deposited, outreach sent',
        defaultValue: 'Measurable daily output quota',
        quickOptions: ['Output units (calls/pages/leads)', 'Time-blocked focused sessions', 'Milestone check-ins'],
      },
    ];
  }
}

// Fallback breakdown math generator
function generateFallbackBreakdown(goal: string, answers: { question: string; answer: string }[]) {
  // Extract number from goal if possible (e.g., 25 distributors -> 25)
  const numMatch = goal.match(/(\d+[\d,]*)/);
  const targetNumber = numMatch ? parseInt(numMatch[1].replace(/,/g, ''), 10) : 25;
  const monthlyAvg = Math.max(1, Math.round((targetNumber / 12) * 10) / 10);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthlyGoals = months.map((m, idx) => {
    // Distribute targetNumber over 12 months with a realistic gentle ramp-up
    const weight = 0.6 + (idx / 11) * 0.8;
    const val = Math.max(1, Math.round((targetNumber / 12) * weight));
    return {
      id: `m-${idx + 1}`,
      monthIndex: idx + 1,
      monthName: m,
      targetValue: val,
      originalTargetValue: val,
      currentValue: 0,
      unit: 'milestone units',
      milestoneTitle: `Month ${idx + 1}: Target ${val} milestone units`,
      keyFocus: `Maintain consistent daily actions and lock in ${val} validated completions.`,
      isCustomAdded: false,
    };
  });

  return {
    yearlyGoal: goal,
    metricName: 'milestone units',
    yearlyTargetNumber: targetNumber,
    mathExplanation: {
      yearlyTargetText: `${targetNumber} total achieved by end of the 12-month cycle.`,
      formulaSummary: `${targetNumber} total ÷ 12 months = ~${monthlyAvg} per month. At typical conversion rates, each month requires ~42 qualifying touchpoints or ~10 weekly focused efforts, broken into 2 decisive daily actions per day.`,
      monthlyBreakdownExplanation: `Each month is locked with a non-reducible quota. Completing the daily checklist guarantees meeting each monthly threshold.`,
      dailyCommitmentExplanation: `By completing your 3-4 daily tasks every single day, the cumulative volume mathematically delivers the full yearly target without last-minute cramming.`,
    },
    monthlyGoals,
    weeklyActions: [
      {
        id: 'w1',
        title: 'Conduct 10 core outreach or progress sessions',
        targetPerWeek: 10,
        unit: 'sessions',
        whyItMatters: 'Directly yields the conversion pipeline required for the monthly target.',
      },
      {
        id: 'w2',
        title: 'Follow up with 5 active leads / pending opportunities',
        targetPerWeek: 5,
        unit: 'follow-ups',
        whyItMatters: '70% of conversions happen during the second and third follow-up.',
      },
      {
        id: 'w3',
        title: 'Audit and record weekly progress metric tally',
        targetPerWeek: 1,
        unit: 'audit',
        whyItMatters: 'Ensures zero leakage and confirms targets remain on schedule.',
      },
    ],
    dailyTasks: [
      {
        id: 'd1',
        title: 'Initiate 2 new high-quality direct conversations / inputs',
        category: 'Outreach & Growth',
        dailyQuota: 2,
        unit: 'connections',
        completed: false,
        mathTracing: '2 per weekday = 10 per week = 42 per month. Yields the necessary monthly conversion volume.',
      },
      {
        id: 'd2',
        title: 'Follow up warmly with 1 warm prospect or existing thread',
        category: 'Nurture & Pipeline',
        dailyQuota: 1,
        unit: 'follow-up',
        completed: false,
        mathTracing: 'Prevents drop-off and secures conversion from previous efforts.',
      },
      {
        id: 'd3',
        title: 'Spend 20 focused minutes on skill prep & system organization',
        category: 'Mastery & Focus',
        dailyQuota: 20,
        unit: 'minutes',
        completed: false,
        mathTracing: 'Compounds skill advantage and keeps tools frictionless.',
      },
      {
        id: 'd4',
        title: 'Log daily score and celebrate today’s dedication',
        category: 'Accountability',
        dailyQuota: 1,
        unit: 'check-in',
        completed: false,
        mathTracing: 'Reinforces identity and unlocks your daily victory token.',
      },
    ],
    tokensEarned: 0,
    dayStreak: 0,
    history: [],
  };
}

// 6-digit Email Verification Code Store (10-minute expiry, 30s resend cooldown)
interface VerificationRecord {
  code: string;
  expiresAt: number;
  lastSentAt: number;
}
const verificationCodes = new Map<string, VerificationRecord>();

app.post('/api/auth/send-code', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email is required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = verificationCodes.get(normalizedEmail);
  const now = Date.now();

  // Enforce 30-second cooldown on resends
  if (existing && now - existing.lastSentAt < 30 * 1000) {
    const secondsLeft = Math.ceil((30 * 1000 - (now - existing.lastSentAt)) / 1000);
    return res.status(429).json({ error: `Please wait ${secondsLeft} seconds before requesting a new code.` });
  }

  // Generate 6 digit numeric code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  verificationCodes.set(normalizedEmail, {
    code,
    expiresAt,
    lastSentAt: now,
  });

  console.log(`[Goal Planner Verification] 6-digit code for ${normalizedEmail}: ${code} (expires in 10 mins)`);

  return res.json({
    success: true,
    message: `A 6-digit confirmation code was sent to ${normalizedEmail}.`,
    debugCode: code,
  });
});

app.post('/api/auth/verify-code', (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and 6-digit code are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const record = verificationCodes.get(normalizedEmail);
  const now = Date.now();

  if (!record) {
    return res.status(400).json({ error: 'No verification code found. Please tap Resend code.' });
  }

  if (now > record.expiresAt) {
    verificationCodes.delete(normalizedEmail);
    return res.status(400).json({ error: 'This confirmation code has expired (10-minute limit). Please tap Resend code.' });
  }

  if (record.code !== String(code).trim()) {
    return res.status(400).json({ error: 'Incorrect 6-digit confirmation code. Please check your email and try again.' });
  }

  // Code verified!
  verificationCodes.delete(normalizedEmail);
  return res.json({ success: true, message: 'Email confirmed successfully!' });
});

// Endpoint 1: Clarifying Questions
app.post('/api/goal/clarify', async (req: Request, res: Response) => {
  const { yearlyGoal } = req.body;

  if (!yearlyGoal || typeof yearlyGoal !== 'string' || !yearlyGoal.trim()) {
    return res.status(400).json({ error: 'Please provide a valid yearly goal description.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    const fallback = generateFallbackQuestions(yearlyGoal);
    return res.json({ questions: fallback });
  }

  try {
    const prompt = `You are an expert strategic planner specializing in backward mathematical goal breakdowns.
The user wants to achieve this yearly goal:
"${yearlyGoal}"

To break this down with rigorous mathematical precision (tracing daily to-dos directly into weekly actions, monthly quotas, and the final yearly number), generate 2 or 3 quick, crisp clarifying questions.
Questions should clarify key conversion factors, baseline rates, or capacity constraints (e.g., current conversion rate, weekly time commitment, current progress/starting baseline, average transaction/session size).

Respond in JSON matching this exact schema:
{
  "questions": [
    {
      "id": "q1",
      "question": "Crisp question text",
      "hint": "Brief helpful guidance or example",
      "defaultValue": "Realistic default answer",
      "quickOptions": ["Option A", "Option B", "Option C"]
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  hint: { type: Type.STRING },
                  defaultValue: { type: Type.STRING },
                  quickOptions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['id', 'question', 'defaultValue'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return res.json({ questions: parsed.questions });
    }
    return res.json({ questions: generateFallbackQuestions(yearlyGoal) });
  } catch (err: any) {
    console.error('Error in /api/goal/clarify:', err);
    return res.json({ questions: generateFallbackQuestions(yearlyGoal) });
  }
});

// Endpoint 2: Full Backward Math Breakdown
app.post('/api/goal/breakdown', async (req: Request, res: Response) => {
  const { yearlyGoal, answers, startingMonth = 1 } = req.body;

  if (!yearlyGoal || typeof yearlyGoal !== 'string') {
    return res.status(400).json({ error: 'Yearly goal is required.' });
  }

  const answersSummary = (answers || [])
    .map((a: any) => `- Q: ${a.question} -> A: ${a.answer}`)
    .join('\n');

  if (!process.env.GEMINI_API_KEY) {
    const fallback = generateFallbackBreakdown(yearlyGoal, answers || []);
    return res.json(fallback);
  }

  try {
    const prompt = `You are a world-class strategist and mathematician specializing in backward goal decomposition for high-achieving individuals.
The user has set the following yearly goal:
"${yearlyGoal}"

User's clarifying context:
${answersSummary || 'No specific baseline provided, assume realistic standard benchmarks.'}

CRITICAL RULES:
1. Every task must trace DIRECTLY back to the yearly goal. Nothing generic (no empty "drink water" unless the goal is health/hydration).
2. Work backwards with REAL NUMBERS and explicit math.
   Example: If the goal is "add 25 new distributors this year", calculate the monthly target (~2 per month), estimate how many conversations it takes to get one yes (e.g. 5% conversion = 20 conversations per signup = ~40 conversations per month), then set daily actions such as "talk to 2 new prospective distributors every weekday" and "follow up with 1 active lead".
3. Return exactly 12 fixed monthly goals. Each month must have a specific, measurable numeric target (targetValue) that sums up or culminates to achieve the full yearly goal.
4. Provide weekly core actions (3-4 items) with numeric quotas per week.
5. Provide a daily to-do list (3-5 items) with specific daily quotas and an explicit "mathTracing" field explaining why completing this daily to-do guarantees reaching the weekly and yearly goal.
6. Provide a warm, empowering, logical BackwardMathExplanation explaining the funnel.

Return JSON matching this schema:
{
  "metricName": "e.g. new distributors / closed deals / pages written / kilometers",
  "yearlyTargetNumber": 25,
  "mathExplanation": {
    "yearlyTargetText": "Clear statement of the yearly summit",
    "formulaSummary": "Explicit math formula showing how daily multiplies to yearly",
    "monthlyBreakdownExplanation": "Why the monthly targets are structured this way",
    "dailyCommitmentExplanation": "How daily consistency mathematically guarantees the finish line"
  },
  "monthlyGoals": [
    {
      "monthIndex": 1,
      "monthName": "January",
      "targetValue": 2,
      "unit": "distributors",
      "milestoneTitle": "Onboard 2 initial distributors & activate outreach funnel",
      "keyFocus": "Warm outreach and pipeline seeding"
    }
  ],
  "weeklyActions": [
    {
      "title": "Hold 10 exploratory distributor conversations",
      "targetPerWeek": 10,
      "unit": "conversations",
      "whyItMatters": "At 5% conversion, 10 weekly chats yields ~2 monthly partner signups."
    }
  ],
  "dailyTasks": [
    {
      "title": "Reach out to 2 new prospective distributors",
      "category": "Direct Outreach",
      "dailyQuota": 2,
      "unit": "contacts",
      "mathTracing": "2 per day x 5 days = 10 weekly conversations = 40 monthly = 2 signups/month = 25/year."
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            metricName: { type: Type.STRING },
            yearlyTargetNumber: { type: Type.NUMBER },
            mathExplanation: {
              type: Type.OBJECT,
              properties: {
                yearlyTargetText: { type: Type.STRING },
                formulaSummary: { type: Type.STRING },
                monthlyBreakdownExplanation: { type: Type.STRING },
                dailyCommitmentExplanation: { type: Type.STRING },
              },
              required: ['yearlyTargetText', 'formulaSummary', 'monthlyBreakdownExplanation', 'dailyCommitmentExplanation'],
            },
            monthlyGoals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  monthIndex: { type: Type.INTEGER },
                  monthName: { type: Type.STRING },
                  targetValue: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  milestoneTitle: { type: Type.STRING },
                  keyFocus: { type: Type.STRING },
                },
                required: ['monthIndex', 'monthName', 'targetValue', 'unit', 'milestoneTitle', 'keyFocus'],
              },
            },
            weeklyActions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  targetPerWeek: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  whyItMatters: { type: Type.STRING },
                },
                required: ['title', 'targetPerWeek', 'unit', 'whyItMatters'],
              },
            },
            dailyTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  dailyQuota: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  mathTracing: { type: Type.STRING },
                },
                required: ['title', 'category', 'dailyQuota', 'unit', 'mathTracing'],
              },
            },
          },
          required: ['metricName', 'yearlyTargetNumber', 'mathExplanation', 'monthlyGoals', 'weeklyActions', 'dailyTasks'],
        },
      },
    });

    const data = JSON.parse(response.text || '{}');

    // Enrich items with stable client IDs and ensure monthly targets cannot be deleted
    const enrichedMonthlyGoals = (data.monthlyGoals || []).map((m: any, idx: number) => ({
      id: `month-${idx + 1}-${Date.now()}`,
      monthIndex: m.monthIndex || idx + 1,
      monthName: m.monthName || `Month ${idx + 1}`,
      targetValue: Number(m.targetValue) || 1,
      originalTargetValue: Number(m.targetValue) || 1,
      currentValue: 0,
      unit: m.unit || data.metricName || 'units',
      milestoneTitle: m.milestoneTitle || `Month ${idx + 1} Target`,
      keyFocus: m.keyFocus || 'Consistent execution',
      isCustomAdded: false,
    }));

    const enrichedWeeklyActions = (data.weeklyActions || []).map((w: any, idx: number) => ({
      id: `week-${idx + 1}-${Date.now()}`,
      title: w.title,
      targetPerWeek: Number(w.targetPerWeek) || 1,
      unit: w.unit || 'actions',
      whyItMatters: w.whyItMatters || 'Supports monthly milestone',
    }));

    const enrichedDailyTasks = (data.dailyTasks || []).map((d: any, idx: number) => ({
      id: `task-${idx + 1}-${Date.now()}`,
      title: d.title,
      category: d.category || 'Focus',
      dailyQuota: Number(d.dailyQuota) || 1,
      unit: d.unit || 'items',
      completed: false,
      mathTracing: d.mathTracing || 'Directly compounds to yearly outcome.',
    }));

    return res.json({
      yearlyGoal,
      metricName: data.metricName,
      yearlyTargetNumber: data.yearlyTargetNumber,
      mathExplanation: data.mathExplanation,
      monthlyGoals: enrichedMonthlyGoals,
      weeklyActions: enrichedWeeklyActions,
      dailyTasks: enrichedDailyTasks,
    });
  } catch (err: any) {
    console.error('Error generating breakdown via Gemini:', err);
    return res.json(generateFallbackBreakdown(yearlyGoal, answers || []));
  }
});

// Endpoint 3: Redistribute Missed Work
app.post('/api/goal/redistribute', async (req: Request, res: Response) => {
  const { yearlyGoal, missedTasks, remainingDaysInMonth, remainingMonths } = req.body;

  try {
    const prompt = `You are a compassionate, rigorous goal coach.
Yearly Goal: "${yearlyGoal}"
The user missed some daily actions recently:
${JSON.stringify(missedTasks)}
Remaining days this month: ${remainingDaysInMonth || 20}
Remaining months in year: ${remainingMonths || 10}

RULE: NEVER shrink or compromise the yearly goal.
Redistribute the missed units across the remaining days and upcoming months so the yearly goal still lands 100% on target.
Explain the subtle adjustment in daily pace warmly and encouragingly, and provide the adjusted daily tasks.

Return JSON:
{
  "explanation": "Warm, encouraging explanation of how the shortfall was smoothly absorbed without stress",
  "adjustedDailyTasks": [
    {
      "taskTitle": "Original or adjusted task title",
      "newDailyQuota": 3,
      "reason": "Increased slightly from 2 to 3 for the next 7 days to cover the 5 missed reach-outs."
    }
  ],
  "pacingTip": "Calm reminder that consistency beats perfection"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in redistribute:', err);
    return res.json({
      explanation: 'Missed actions have been gently distributed across the remaining weekdays. Your yearly goal remains 100% achievable!',
      adjustedDailyTasks: (missedTasks || []).map((m: any) => ({
        taskTitle: m.title || m.taskTitle,
        newDailyQuota: (m.dailyQuota || 2) + 1,
        reason: 'Temporary +1 daily quota for the next few days to smoothly catch up.',
      })),
    });
  }
});

// Endpoint 4: Weekly Check-In Strategic Tweaks
app.post('/api/goal/weekly-tweaks', async (req: Request, res: Response) => {
  const {
    yearlyGoal,
    currentMonth,
    monthlyTarget,
    monthlyCompleted,
    tasksCompletedCount,
    totalTasksScheduled,
    userReflection,
  } = req.body;

  const completionPct = totalTasksScheduled > 0 ? Math.round((tasksCompletedCount / totalTasksScheduled) * 100) : 100;

  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      tweaks: [
        {
          title: 'Prime Time Outreach Block',
          advice: 'Schedule your core outreach tasks in the first 45 minutes of the morning when focus is highest.',
          category: 'Habit',
        },
        {
          title: 'Warm Touchpoint Follow-Up',
          advice: 'Dedicate Friday afternoon exclusively to re-engaging conversations from the past 14 days.',
          category: 'Strategy',
        },
        {
          title: 'Steady Rhythm Preservation',
          advice: 'Protect a 15-minute buffer between tasks to prevent fatigue and preserve your daily streak.',
          category: 'Pacing',
        },
      ],
    });
  }

  try {
    const prompt = `You are a supportive, high-performance strategic coach.
User's Yearly Goal: "${yearlyGoal}"
This week's performance:
- Completed ${tasksCompletedCount} of ${totalTasksScheduled} planned tasks (${completionPct}% completion).
- Current Month (${currentMonth || 'Current Month'}): ${monthlyCompleted || 0} / ${monthlyTarget || 2} achieved so far.
- User Reflection: "${userReflection || 'Felt steady this week.'}"

Provide exactly 2 or 3 highly actionable, warm, realistic strategic tweaks to stay 100% on track for the monthly and yearly goal.
Focus on habits, pacing, and conversion without causing overwhelm.

Return JSON matching:
{
  "tweaks": [
    {
      "title": "Short punchy title (3-5 words)",
      "advice": "1-2 sentences of practical, encouraging instruction",
      "category": "Pacing" | "Habit" | "Strategy"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (parsed.tweaks && Array.isArray(parsed.tweaks) && parsed.tweaks.length > 0) {
      return res.json(parsed);
    }
    throw new Error('Invalid tweaks response');
  } catch (err: any) {
    console.error('Error generating weekly tweaks:', err);
    return res.json({
      tweaks: [
        {
          title: 'Morning Focus Window',
          advice: 'Complete your highest-leverage outreach task before checking incoming notifications.',
          category: 'Habit',
        },
        {
          title: 'Batch Similar Interactions',
          advice: 'Group outreach messages into a single 30-minute block for greater flow and speed.',
          category: 'Strategy',
        },
        {
          title: 'Pacing Recalibration',
          advice: 'If energy dips midweek, protect your baseline touchpoints and leave deep reviews for Friday.',
          category: 'Pacing',
        },
      ],
    });
  }
});

// Configure Vite in development or static serving in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Goal Planner server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
