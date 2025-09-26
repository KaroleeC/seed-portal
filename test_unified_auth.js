// Test unified authentication system
console.log("=== Testing Unified Authentication System ===");

// Test 1: Check current session status
fetch("/api/user", { credentials: "include" })
  .then((res) => {
    console.log("Session check status:", res.status);
    if (res.status === 401) {
      console.log("✅ No active session (expected for fresh test)");
    } else {
      return res.json();
    }
  })
  .then((data) => {
    if (data) {
      console.log("📋 Active session found:", data);
    }
  })
  .catch((err) => console.error("❌ Session check failed:", err));

// Test 2: Verify Google OAuth sync endpoint exists
fetch("/api/auth/google/sync", { method: "POST" })
  .then((res) => {
    if (res.status === 401) {
      console.log("✅ Google sync endpoint exists (requires token)");
    } else if (res.status === 400) {
      console.log("✅ Google sync endpoint exists (requires data)");
    } else {
      console.log("⚠️ Unexpected response:", res.status);
    }
  })
  .catch((err) => console.error("❌ Google sync check failed:", err));

// Test 3: Verify email login endpoint
fetch("/api/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "test@seedfinancial.io", password: "test" }),
  credentials: "include",
})
  .then((res) => {
    if (res.status === 400 || res.status === 401) {
      console.log(
        "✅ Email login endpoint working (invalid credentials expected)",
      );
    } else {
      console.log("⚠️ Unexpected login response:", res.status);
    }
  })
  .catch((err) => console.error("❌ Email login check failed:", err));

// Test 4: Check logout endpoint
fetch("/api/logout", { method: "POST", credentials: "include" })
  .then((res) => {
    if (res.status === 200) {
      console.log("✅ Logout endpoint working");
    } else {
      console.log("⚠️ Unexpected logout response:", res.status);
    }
  })
  .catch((err) => console.error("❌ Logout check failed:", err));

console.log("=== Authentication Test Complete ===");
console.log("Next steps:");
console.log("1. Try Google sign-in from the UI");
console.log("2. Check if session persists after login");
console.log("3. Verify protected routes work");
