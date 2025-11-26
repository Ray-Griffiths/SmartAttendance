import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ Use AuthContext login - it handles token storage and state updates
      await authLogin(email, password);
      toast.success("Login successful! Redirecting...");

      // ✅ Redirect based on role after AuthContext updates
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setTimeout(() => {
          switch (user.role) {
            case "admin":
              navigate("/admin/dashboard", { replace: true });
              break;
            case "lecturer":
              navigate("/lecturer/dashboard", { replace: true });
              break;
            case "student":
              navigate("/student", { replace: true });
              break;
            default:
              navigate("/", { replace: true });
              break;
          }
        }, 100);
      }
    } catch (err: any) {
      toast.error(err?.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg border border-gray-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">Welcome Back</CardTitle>
          <CardDescription className="text-gray-500 mt-1">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <Label htmlFor="email" className="font-medium text-gray-700">Email</Label>
              <Input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1"
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="font-medium text-gray-700">Password</Label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="mt-1"
              />
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end text-sm text-blue-600 hover:underline">
              <a href="/forgot-password">Forgot password?</a>
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-4">
            <hr className="flex-grow border-gray-300" />
            <span className="mx-2 text-gray-400 text-sm">OR</span>
            <hr className="flex-grow border-gray-300" />
          </div>

          {/* Register Links */}
          <div className="text-center text-sm text-gray-600 space-y-2">
            <p>
              Don’t have a student account?{" "}
              <a href="/register" className="text-blue-600 hover:underline">Register here</a>
            </p>
            <p>
              Are you a lecturer?{" "}
              <a href="/lecturer-signup" className="text-purple-600 hover:underline">
                Sign up as Lecturer
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
