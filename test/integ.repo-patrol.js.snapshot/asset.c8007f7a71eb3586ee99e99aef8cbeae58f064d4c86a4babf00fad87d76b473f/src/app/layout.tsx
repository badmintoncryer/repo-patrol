import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "repo-patrol",
  description: "OSS Repository Maintenance Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen">
        <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
            <a href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">
                repo<span className="text-indigo-400">-patrol</span>
              </span>
            </a>
            <nav className="flex items-center gap-6 text-sm">
              <a
                href="/"
                className="text-slate-400 hover:text-white transition-colors"
              >
                Dashboard
              </a>
              <a
                href="/repos/new"
                className="text-slate-400 hover:text-white transition-colors"
              >
                + Add Repo
              </a>
              <a
                href="/api/auth/sign-out"
                className="text-slate-500 hover:text-rose-400 transition-colors"
              >
                Sign Out
              </a>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
