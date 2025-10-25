import { redirect } from 'next/navigation'

export default function Home() {
  // Always redirect root to the login route.
  // This performs a server-side redirect so visiting '/' navigates to '/auth/login'.
  redirect('/auth/login')
}
