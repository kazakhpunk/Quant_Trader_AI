// pages/signin.tsx
"use client";

import { useEffect } from "react";
import { SignIn, useSession } from "@clerk/nextjs";
import { getApiUrl } from "@/lib/utils";

const SignInPage = () => {
  const { session } = useSession();

  useEffect(() => {
    if (session) {
      window.location.href = `${getApiUrl()}/api/oauth/authorize`;
    }
  }, [session]);

  return (
    <div className="flex pt-36 justify-center min-h-screen">
      <SignIn 
        routing="hash" 
        forceRedirectUrl="/signin"
        signUpUrl="https://quant-trader-ai-v4.vercel.app/signup"
      />
    </div>
  );
};

export default SignInPage;
