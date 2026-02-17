import { NextResponse } from "next/server";

export async function GET() {
    // Return the server time as ISO string
    // This is more reliable than third party APIs for license checks
    return NextResponse.json({
        datetime: new Date().toISOString()
    });
}
