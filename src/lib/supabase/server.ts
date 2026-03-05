import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()
    const internalUrl = process.env.SUPABASE_INTERNAL_URL;

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            ...(internalUrl ? {
                global: {
                    fetch: (fetchUrl, options) => {
                        const urlString = typeof fetchUrl === 'string' ? fetchUrl : (fetchUrl instanceof URL ? fetchUrl.toString() : fetchUrl.url);
                        const mappedUrl = urlString.replace(process.env.NEXT_PUBLIC_SUPABASE_URL!, internalUrl);
                        return fetch(mappedUrl, options);
                    }
                }
            } : {}),
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Ignore error from server components since middleware handles refreshing
                    }
                },
            },
        }
    )
}
