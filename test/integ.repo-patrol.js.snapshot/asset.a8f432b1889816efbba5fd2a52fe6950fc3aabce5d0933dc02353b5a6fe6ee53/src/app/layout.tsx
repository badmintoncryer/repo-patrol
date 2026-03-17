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
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold">repo-patrol</h1>
            <nav className="flex gap-4 text-sm">
              <a href="/" className="hover:text-blue-600">
                Dashboard
              </a>
              <a href="/repos/new" className="hover:text-blue-600">
                + Add Repo
              </a>
              <a href="/api/auth/sign-out" className="hover:text-red-600">
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
