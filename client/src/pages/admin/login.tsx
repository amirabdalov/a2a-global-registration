import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { A2ALogo } from "@/components/a2a-logo";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, setSessionToken } from "@/lib/queryClient";
import { Loader2, Shield, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");

  const handleLogin = async () => {
    if (!email || !password) { toast({ title: "Email and password required", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/admin/login", { email, password });
      const data = await res.json();
      if (data.requireOtp) {
        setOtpStep(true);
        toast({ title: "OTP sent to your email" });
      }
    } catch (err: any) {
      toast({ title: err.message || "Login failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/admin/verify-otp", { email, otp });
      const data = await res.json();
      if (data.token) setSessionToken(data.token);
      toast({ title: "Welcome, Admin" });
      setLocation("/admin/dashboard");
    } catch (err: any) {
      toast({ title: err.message || "Verification failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3"><A2ALogo size="large" /></div>
          <p className="text-sm text-gray-400 flex items-center justify-center gap-1.5"><Shield className="w-4 h-4" /> Admin Console</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          {!otpStep ? (
            <>
              <div>
                <Label className="text-gray-300">Admin Email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@a2a.global" className="bg-gray-800 border-gray-700 text-white" data-testid="input-admin-email" />
              </div>
              <div>
                <Label className="text-gray-300">Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="bg-gray-800 border-gray-700 text-white" data-testid="input-admin-password" onKeyDown={e => e.key === "Enter" && handleLogin()} />
              </div>
              <Button onClick={handleLogin} disabled={loading} className="w-full bg-[#0F3DD1]" data-testid="button-admin-login">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4 mr-2" />Sign In</>}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-400 text-center">Enter the OTP sent to <span className="text-white font-medium">{email}</span></p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp} data-testid="input-admin-otp">
                  <InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} /><InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} /></InputOTPGroup>
                </InputOTP>
              </div>
              <Button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6} className="w-full bg-[#0F3DD1]" data-testid="button-admin-verify">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Access Dashboard"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
