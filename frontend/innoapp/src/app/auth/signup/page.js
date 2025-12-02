'use server'
import { redirect } from 'next/navigation'

export default function SignupPage() {
  // all signup routes are disabled — send users to SPA root
  redirect('/')
}