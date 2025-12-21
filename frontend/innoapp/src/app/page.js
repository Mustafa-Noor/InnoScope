"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { ActionCards } from "./components/ActionCards";
import { Footer } from "./components/Footer";
import { ChatInterface } from "./components/ChatInterface";
import "./app.css";

function HomeContent() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = searchParams.get("token");
      const user_id = searchParams.get("user_id");
      const user_name = searchParams.get("user_name");
      const user_email = searchParams.get("user_email");

      const userobj = {
        id: user_id,
        name: user_name,
        email: user_email,
      };

      if (token && user_id && user_email) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userobj));
        router.replace("/");
        return;
      }
      setCheckingAuth(false);
    }
  }, [router, searchParams]);

  if (checkingAuth) {
    return (
      <section className="flex flex-col items-center justify-center min-h-screen">
        <div className="loader" />
        <span>Loading...</span>
      </section>
    );
  }

  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <Hero />
        <ActionCards onChatClick={() => setIsChatOpen(true)} />
      </main>
      <Footer />
      {isChatOpen && <ChatInterface onClose={() => setIsChatOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <Suspense
      fallback={
        <section className="flex flex-col items-center justify-center min-h-screen">
          <div className="loader" />
          <span>Loading...</span>
        </section>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
