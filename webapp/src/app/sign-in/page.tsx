import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 -mt-20">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-white">
          repo<span className="text-indigo-400">-patrol</span>
        </h2>
        <p className="mt-3 text-center text-sm text-slate-400">
          Sign in to access the dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-4 shadow-2xl shadow-indigo-500/5 sm:rounded-xl sm:px-10">
          <div className="flex flex-col items-center">
            <p className="mb-6 text-center text-sm text-slate-400">
              Please sign in with your Cognito account to continue
            </p>

            <Link
              href="/api/auth/sign-in"
              className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 transition-all shadow-lg shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              prefetch={false}
            >
              Sign in with Cognito
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
