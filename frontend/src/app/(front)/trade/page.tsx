"use client";

import Link from "next/link";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { TradePanel } from "@/components/v2/trade-form";
import LoginPrompt from "@/components/v3/login-prompt";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getApiUrl } from "@/lib/utils";

export default function CategoriesPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("access_token");

      if (token && user) {
        const email =
          user.primaryEmailAddress?.emailAddress ||
          user.emailAddresses[0]?.emailAddress;

        try {
          const response = await fetch(`${getApiUrl()}/api/oauth/store_token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ accessToken: token, email }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          localStorage.setItem("alpaca_access_token", token);
          setAccessToken(token); // Make sure to update state
          console.log("Access token:", token);
          router.push("/trade");
        } catch (error) {
          console.error("Error storing token:", error);
        }
      } else {
        const storedToken = localStorage.getItem("alpaca_access_token");
        if (storedToken) {
          setAccessToken(storedToken);
          console.log("Stored token:", storedToken);
        } else {
          console.error("No token found in URL or local storage");
        }
      }
    };

    handleOAuthCallback();
  }, [router, user]);

  return (
    <ContentLayout title="Categories">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Trade</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <LoginPrompt />
    </ContentLayout>
  );
}
