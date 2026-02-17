/**
 * Fetches the current time from the internal server API to avoid
 * relying on the device's local clock which can be tampered with.
 */
export async function getInternetNow(): Promise<Date> {
    try {
        // Use World Time API for reliable server time in exported apps
        const res = await fetch("https://worldtimeapi.org/api/timezone/Etc/UTC", {
            cache: "no-store",
            signal: AbortSignal.timeout(5000)
        });

        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
            throw new Error(`Time server returned non-JSON response or error (Status: ${res.status})`);
        }

        try {
            const data = await res.json();
            // WorldTimeAPI uses 'utc_datetime'
            if (!data.utc_datetime) throw new Error("Missing datetime in response");
            return new Date(data.utc_datetime);
        } catch (parseError) {
            throw new Error("Failed to parse server time data");
        }
    } catch (error) {
        console.error("Error fetching internet time:", error);
        // Fallback to local time if API fails (user could tamper, but better than a crash)
        return new Date();
    }
}
