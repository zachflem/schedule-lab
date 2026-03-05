import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/update-password'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Forward the user to the next URL, stripping the code
            return NextResponse.redirect(`${requestUrl.origin}${next}`)
        } else {
            console.error("[AuthCallback] Error exchanging code for session:", error)
        }
    }

    // Return the user to login with an error appended if something fails
    return NextResponse.redirect(`${requestUrl.origin}/login?error=Invalid+or+expired+invite+link`)
}
