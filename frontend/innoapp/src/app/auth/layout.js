import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "InnoScope - Authentication",
  description: "Sign in or create your InnoScope account to access powerful business intelligence tools.",
};

export default function AuthLayout({ children }) {
  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      style={{
        backgroundColor: '#ffffff',
        fontFamily: 'Poppins, sans-serif',
        margin: 0,
        padding: 0,
        minHeight: '100vh'
      }}
    >
      {children}
    </div>
  );
}