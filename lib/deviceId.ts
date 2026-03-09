import { Preferences } from '@capacitor/preferences';

const DEVICE_ID_KEY = 'tutor_device_id';

/**
 * Generates a random 6-character alphanumeric string (uppercase)
 */
function generateRandomId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Retrieves the device ID from storage, or creates one if it doesn't exist.
 */
export async function getDeviceId(): Promise<string> {
    const { value } = await Preferences.get({ key: DEVICE_ID_KEY });

    if (value) {
        return value;
    }

    // Generate, store, and return a new ID
    const newId = generateRandomId();
    await Preferences.set({ key: DEVICE_ID_KEY, value: newId });
    return newId;
}
