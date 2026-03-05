import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const internalUrl = process.env.SUPABASE_INTERNAL_URL;

    const supabase = createServerClient(
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
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname;

    console.log(`[DEBUG Middleware] path: ${path}, user: ${user?.email}`);
    console.log(`[DEBUG Middleware] cookies:`, request.cookies.getAll().map(c => c.name).join(', '));

    // Protect all routes except /login, /login/forgot, /enquiry (public form), /auth (callbacks), /update-password
    if (
        !user &&
        !path.startsWith('/login') &&
        !path.startsWith('/auth') &&
        !path.startsWith('/update-password') &&
        !path.startsWith('/enquiry')
    ) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        console.log(`[DEBUG Middleware] redirecting to /login from ${path}`);
        return NextResponse.redirect(url)
    }

    // Redirect logged-in users away from /login or /login/forgot
    if (user) {
        if (path === '/login' || path === '/login/forgot') {
            const url = request.nextUrl.clone()
            url.pathname = '/'
            console.log(`[DEBUG Middleware] redirecting to / from ${path}`);
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
