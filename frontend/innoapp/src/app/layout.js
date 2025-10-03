import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SideNav from './components/SideNav';

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
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <SideNav />
          <main style={{ 
            marginLeft: '240px', 
            flex: 1,
            backgroundColor: '#ffffff',
            minHeight: '100vh',
            padding: '20px'
          }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
