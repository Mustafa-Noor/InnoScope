import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
          backgroundColor: '#f8faf9', 
          fontFamily: 'Poppins, sans-serif',
          margin: 0,
          padding: 0,
          minHeight: '100vh'
        }}
      >
        <AuthProvider>
          <div style={{ display: 'block', padding: 0 }}>
            <div style={{ width: '100%' }}>
              {children}
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
