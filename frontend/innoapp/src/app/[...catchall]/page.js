import { redirect } from 'next/navigation'

export default function CatchAll() {
  // Redirect any unmatched route back to root SPA
  redirect('/')
}
