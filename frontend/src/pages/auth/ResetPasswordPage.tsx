import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { resetPassword } from "@/services/authApi"; // Add this function in authApi.ts
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ResetPasswordPage: React.FC = () => {
  // The token is pulled from the URL parameters (e.g., /reset-password/:token)
  const { token } = useParams<{ token: string }>(); 
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    
    // Add basic password strength/length check here if needed
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (!token) {
      toast.error("Invalid or missing token. Please check your link.");
      // Optionally redirect to a helpful page
      navigate("/forgot-password"); 
      return;
    }

    setLoading(true);

    try {
      // Assuming resetPassword is an async function: resetPassword(token, newPassword)
      await resetPassword(token, password);
      toast.success("Password reset successfully! You can now log in.");
      // Redirect to the login page after a successful reset
      navigate("/login"); 
    } catch (err: any) {
      // Use optional chaining for safe access to axios error response
      const errorMessage = err.response?.data?.message || "Failed to reset password. The token may be invalid or expired.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg border border-gray-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">Reset Password</CardTitle>
          <CardDescription className="text-gray-500 mt-1">
            Enter your new password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Use token existence check for a better user experience if the token is missing */}
          {!token ? (
            <div className="text-center space-y-4">
              <p className="text-red-600">Password reset link is invalid or expired.</p>
              <Button onClick={() => navigate("/forgot-password")} className="w-full">
                Request a New Link
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="password" className="font-medium text-gray-700">New Password</Label>
                <Input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password (min 8 chars)"
                  required
                  disabled={loading}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirm-password" className="font-medium text-gray-700">Confirm Password</Label>
                <Input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={loading}
                  className="mt-1"
                />
              </div>

              {/* Submit Button with Loading State */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </span>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;