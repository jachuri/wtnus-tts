'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
  const password = formData.get('password')
  const sitePassword = process.env.SITE_PASSWORD

  if (password === sitePassword) {
    // 24시간 동안 유효한 인증 쿠키 설정
    const cookieStore = await cookies()
    cookieStore.set('auth', 'true', {
      maxAge: 60 * 60 * 24, // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })

    redirect('/')
  } else {
    return { error: '비밀번호가 올바르지 않습니다.' }
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('auth')
  redirect('/login')
}
