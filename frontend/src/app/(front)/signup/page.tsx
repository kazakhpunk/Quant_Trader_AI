// pages/signin.tsx
"use client";

import { useEffect } from "react";
import { SignUp, useSession } from "@clerk/nextjs";

const SignUpPage = () => {
  const { session } = useSession();

  useEffect(() => {
    if (session) {
      window.location.href = `http://localhost:8000/api/oauth/authorize`;
    }
  }, [session]);

  return (
    <div className="flex pt-36 justify-center min-h-screen">
      <SignUp routing="hash" forceRedirectUrl="/signup" />
    </div>
  );
};

export default SignUpPage;
