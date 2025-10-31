// src/lib/dummyAuth.ts
export interface DummyUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** Hard-coded admin – change later when you have a real API */
const DUMMY_ADMIN: DummyUser = {
  id: "admin-001",
  name: "Admin User",
  email: "admin@example.com",
  role: "admin",
};

/**
 * Fake login – returns a fake JWT + user object after a short delay.
 * In production replace this with your real `/api/login` call.
 */
export async function loginDummy(
  email: string,
  password: string
): Promise<{ token: string; user: DummyUser }> {
  // tiny network simulation
  await new Promise((r) => setTimeout(r, 400));

  if (email === "admin@example.com" && password === "admin123") {
    return {
      token: "dummy-jwt-admin-xyz", // any string works – your API client will just read it
      user: DUMMY_ADMIN,
    };
  }

  throw new Error("Invalid credentials");
}