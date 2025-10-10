// Test script to simulate the exact OAuth flow
const fetch = require("node-fetch");

async function testOAuthFlow() {
  console.log("🧪 Testing OAuth flow simulation...");

  // Create a simulated Google OAuth user payload
  const testUser = {
    sub: "test-google-id-123",
    email: "jon@seedfinancial.io",
    given_name: "Jon",
    family_name: "Test",
    picture: "https://example.com/photo.jpg",
    hd: "seedfinancial.io",
  };

  try {
    console.log("🔐 Simulating OAuth sync request...");
    const response = await fetch("http://localhost:5000/api/auth/google/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer simulated-valid-token",
      },
      body: JSON.stringify(testUser),
    });

    console.log("Response status:", response.status);
    console.log("Set-Cookie headers:", response.headers.raw()["set-cookie"]);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ OAuth sync response:", data);

      // Now test session persistence
      const sessionCookie = response.headers.raw()["set-cookie"]?.[0];
      if (sessionCookie) {
        console.log("🍪 Testing session with cookie:", sessionCookie.split(";")[0]);

        const sessionTest = await fetch("http://localhost:5000/api/user", {
          headers: {
            Cookie: sessionCookie,
          },
        });

        console.log("Session test status:", sessionTest.status);
        if (sessionTest.ok) {
          const sessionData = await sessionTest.json();
          console.log("✅ Session verification successful:", sessionData.email);
        } else {
          console.log("❌ Session verification failed");
        }
      }
    } else {
      const errorText = await response.text();
      console.log("❌ OAuth sync failed:", errorText);
    }
  } catch (error) {
    console.error("❌ Test error:", error.message);
  }
}

testOAuthFlow();
