// pages/signin.tsx
"use client";

import { useEffect } from "react";
import { SignUp, useSession } from "@clerk/nextjs";
import { getApiUrl } from "@/lib/utils";

const SignUpPage = () => {
  const { session } = useSession();

  useEffect(() => {
    if (session) {
      window.location.href = `${getApiUrl()}/api/oauth/authorize`;
    }
  }, [session]);

  return (
    <div className="flex pt-36 justify-center min-h-screen">
      <SignUp 
        routing="hash" 
        forceRedirectUrl="/signup" 
        signInUrl="https://quant-trader-ai-v4.vercel.app/signin"/>
    </div>
  );
};

export default SignUpPage;
