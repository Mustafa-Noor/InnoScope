import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// SideNav intentionally removed from root layout so auth pages won't show the sidebar
import { AuthProvider } from './contexts/AuthContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "InnoScope - Innovative Business Intelligence Platform",
  description: "Transform your data into actionable insights with InnoScope's powerful analytics and visualization tools. Make data-driven decisions with confidence.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ 
          backgroundColor: '#ffffff', 
          fontFamily: 'Poppins, sans-serif',
          margin: 0,
          padding: 0
        }}
      >
        <AuthProvider>
          {/* Root layout no longer forces a sidebar/navbar so nested layouts/pages can decide
              whether to render SideNav or Navbar (auth pages should be clean). */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
