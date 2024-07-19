// "use client";

// import { useEffect } from "react";
// import { useRouter } from "next/navigation";

// const OAuthCallbackHandler = () => {
//   const router = useRouter();

//   useEffect(() => {
//     const handleOAuthCallback = async () => {
//       const code = new URLSearchParams(window.location.search).get("code");
//       console.log("Authorization code received:", code); // Log the received code

//       if (code) {
//         try {
//           const response = await fetch(`http://localhost:8000/api/oauth/callback?code=${code}`, {
//             method: 'GET',
//             headers: {
//               'Content-Type': 'application/json'
//             }
//           });

//           if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//           }

//           const data = await response.json();
//           console.log("Response data:", data); // Log the response data

//           if (data.access_token) {
//             // Store the access token in local storage or in state management
//             localStorage.setItem("alpaca_access_token", data.access_token);
//             router.push("/trade");
//           } else {
//             console.error("OAuth failed: No access token in response");
//           }
//         } catch (error) {
//           console.error("Error during OAuth callback", error);
//         }
//       } else {
//         console.error("Authorization code not found in URL");
//       }
//     };

//     handleOAuthCallback();
//   }, [router]);

//   return <div>Loading...</div>;
// };

// export default OAuthCallbackHandler;
