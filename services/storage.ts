import { Preferences } from '@capacitor/preferences';
import { MathSolution } from './types';

const XP_KEY = 'user_xp';
const STREAK_KEY = 'user_streak';
const MAX_STREAK = 'user_max_streak';
const LAST_ACTIVE_KEY = 'last_active_date';
const HISTORY_KEY = 'problem_history';

// XP Rewards
export const XP_PER_PROBLEM = 15;
export const XP_PER_PRACTICE = 10;
export const XP_DAILY_BONUS = 25;

export interface UserStats {
    xp: number;
    level: number;
    streak: number;
    maxStreak: number;
    justGotDailyBonus: boolean;
}

export interface HistoryItem {
    id: string;
    timestamp: number;
    solution: MathSolution;
}

// Helper to determine the user's level based on XP (every 100 XP is a level)
export function calculateLevel(xp: number): number {
    return Math.floor(xp / 100) + 1;
}

export async function getUserStats(): Promise<UserStats> {
    const xpStr = await Preferences.get({ key: XP_KEY });
    const streakStr = await Preferences.get({ key: STREAK_KEY });
    const maxStreakStr = await Preferences.get({ key: MAX_STREAK });

    const xp = xpStr.value ? parseInt(xpStr.value) : 0;
    const streak = streakStr.value ? parseInt(streakStr.value) : 0;
    const maxStreak = maxStreakStr.value ? parseInt(maxStreakStr.value) : 0;

    // Check if the streak needs to be broken because they missed a day
    const lastActiveStr = await Preferences.get({ key: LAST_ACTIVE_KEY });
    let finalStreak = streak;

    if (lastActiveStr.value) {
        const lastActive = new Date(lastActiveStr.value);
        const today = new Date();

        // Reset time to midnight to just compare the dates directly without timezone drama
        lastActive.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(today.getTime() - lastActive.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
            // They missed a day
            finalStreak = 0;
            await Preferences.set({ key: STREAK_KEY, value: '0' });
        }
    }

    return {
        xp,
        level: calculateLevel(xp),
        streak: finalStreak,
        maxStreak,
        justGotDailyBonus: false
    };
}

export async function awardXP(amount: number): Promise<UserStats> {
    const stats = await getUserStats();
    let newXp = stats.xp + amount;
    let newStreak = stats.streak;
    let justGotDailyBonus = false;

    // Check Daily Login Bonus / Streak update
    const lastActiveStr = await Preferences.get({ key: LAST_ACTIVE_KEY });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let isNewDay = true;

    if (lastActiveStr.value) {
        const lastActive = new Date(lastActiveStr.value);
        lastActive.setHours(0, 0, 0, 0);
        if (lastActive.getTime() === today.getTime()) {
            isNewDay = false; // Already played today
        }
    }

    if (isNewDay) {
        newStreak += 1;
        newXp += XP_DAILY_BONUS;
        justGotDailyBonus = true;
        await Preferences.set({ key: LAST_ACTIVE_KEY, value: new Date().toISOString() });
        await Preferences.set({ key: STREAK_KEY, value: newStreak.toString() });

        if (newStreak > stats.maxStreak) {
            await Preferences.set({ key: MAX_STREAK, value: newStreak.toString() });
        }
    }

    await Preferences.set({ key: XP_KEY, value: newXp.toString() });

    return {
        ...stats,
        xp: newXp,
        level: calculateLevel(newXp),
        streak: newStreak,
        maxStreak: Math.max(newStreak, stats.maxStreak),
        justGotDailyBonus
    };
}

// --- HISTORY BATCH ---

export async function getHistory(): Promise<HistoryItem[]> {
    const historyStr = await Preferences.get({ key: HISTORY_KEY });
    if (!historyStr.value) return [];

    try {
        return JSON.parse(historyStr.value);
    } catch {
        return [];
    }
}

export async function saveToHistory(solution: MathSolution) {
    const history = await getHistory();

    const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        solution,
    };

    // Keep only the most recent 20 problems so we don't blow up local storage
    const newHistory = [newItem, ...history].slice(0, 20);

    await Preferences.set({ key: HISTORY_KEY, value: JSON.stringify(newHistory) });
    return newHistory;
}
