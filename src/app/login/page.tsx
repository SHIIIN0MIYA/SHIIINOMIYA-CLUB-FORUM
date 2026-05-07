"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("邮箱或密码错误");
    } else {
      window.location.href = "/posts";
    }
  };

  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold mb-6">登录</h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-sm"
      >
        <input
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-white placeholder-gray-400 outline-none focus:border-[var(--accent)]"
          required
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-white placeholder-gray-400 outline-none focus:border-[var(--accent)]"
          required
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          className="bg-[var(--accent)] text-black py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          登录
        </button>
      </form>
    </div>
  );
}