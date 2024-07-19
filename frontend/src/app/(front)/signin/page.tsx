// pages/signin.tsx
"use client";

import { useEffect } from "react";
import { SignIn, useSession } from "@clerk/nextjs";

const SignInPage = () => {
  const { session } = useSession();

  useEffect(() => {
    if (session) {
      window.location.href = `http://localhost:8000/api/oauth/authorize`;
    }
  }, [session]);

  return (
    <div className="flex pt-36 justify-center min-h-screen">
      <SignIn routing="hash" forceRedirectUrl="/signin" />
    </div>
  );
};

export default SignInPage;
