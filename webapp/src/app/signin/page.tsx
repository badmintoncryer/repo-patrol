import { signIn } from "@/auth";

function CognitoIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="80" height="80" rx="8" fill="#DD344C" />
      <path
        d="M40 22C34.49 22 30 26.49 30 32C30 36.28 32.68 39.95 36.44 41.47L34 52H46L43.56 41.47C47.32 39.95 50 36.28 50 32C50 26.49 45.51 22 40 22ZM40 26C43.31 26 46 28.69 46 32C46 35.31 43.31 38 40 38C36.69 38 34 35.31 34 32C34 28.69 36.69 26 40 26ZM36.5 54H43.5V58H36.5V54Z"
        fill="white"
      />
    </svg>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">repo-patrol</h1>
          <p className="text-sm text-gray-500 mt-1">
            サインインしてダッシュボードにアクセス
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("cognito", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 rounded-md bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <CognitoIcon />
            Sign in with Amazon Cognito
          </button>
        </form>
      </div>
    </div>
  );
}
