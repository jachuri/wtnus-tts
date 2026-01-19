import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const authCookie = request.cookies.get('auth')
    const { pathname } = request.nextUrl

    // 로그인 페이지가 아니고, 인증 쿠키가 없으면 로그인 페이지로 리다이렉트
    if (!authCookie && pathname !== '/login') {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 이미 로그인되어 있는데 로그인 페이지에 접근하면 메인으로 리다이렉트
    if (authCookie && pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
