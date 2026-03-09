import { Preferences } from '@capacitor/preferences';

export const OTP_SECRET = "MatipaTutor2026";
export const USED_MONTHS_KEY = "tutor_used_months";

/**
 * A simple deterministic hash function that creates a 6-digit number
 * based on a string input.
 */
function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Make it positive and exactly 6 digits
    const positiveHash = Math.abs(hash);
    const sixDigits = positiveHash % 1000000;

    // Pad with leading zeros if necessary
    return sixDigits.toString().padStart(6, '0');
}

/**
 * Calculates what the code should be for a specific device and month.
 * e.g., generateDeviceCode("A7X9B2", "2026-03") -> "392018"
 */
export function generateDeviceCode(deviceId: string, monthKey: string): string {
    const dataToHash = `${deviceId.trim().toUpperCase()}-${monthKey}-${OTP_SECRET}`;
    return hashString(dataToHash);
}

/**
 * Retrieves the array of previously used month keys.
 */
export async function getUsedMonths(): Promise<string[]> {
    const { value } = await Preferences.get({ key: USED_MONTHS_KEY });
    if (!value) return [];
    try {
        return JSON.parse(value);
    } catch {
        return [];
    }
}

/**
 * Marks a specific month key as used so it cannot be used again.
 */
export async function markMonthAsUsed(monthKey: string): Promise<void> {
    const used = await getUsedMonths();
    if (!used.includes(monthKey)) {
        used.push(monthKey);
        await Preferences.set({ key: USED_MONTHS_KEY, value: JSON.stringify(used) });
    }
}

/**
 * Helper to get the YYYY-MM key for a given Date object.
 */
function getMonthKey(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Verifies if the entered code is valid for the given Device ID.
 * It checks the "Current" month, "Previous" month, and "Next" month
 * to give a generous window of valid codes.
 * 
 * Returns the matched month key (e.g. "2026-03") if valid and unused, or null if invalid.
 */
export async function verifyDeviceCode(deviceId: string, inputCode: string): Promise<string | null> {
    const cleanInput = (inputCode || "").replace(/\s/g, "");
    if (cleanInput.length !== 6) return null;

    const usedMonths = await getUsedMonths();
    const cleanDeviceId = deviceId.trim().toUpperCase();

    // Check last month, current month, and next two months
    const dateToCheck = new Date();
    dateToCheck.setUTCMonth(dateToCheck.getUTCMonth() - 1); // Start 1 month ago

    for (let i = 0; i < 4; i++) {
        const monthKey = getMonthKey(dateToCheck);

        // Only check this month if they haven't already used it
        if (!usedMonths.includes(monthKey)) {
            const expectedCode = generateDeviceCode(cleanDeviceId, monthKey);
            if (cleanInput === expectedCode) {
                return monthKey; // Valid & Unused Match!
            }
        }

        // Move to the next month for the next loop iteration
        dateToCheck.setUTCMonth(dateToCheck.getUTCMonth() + 1);
    }

    return null; // Invalid code (or code already used)
}
