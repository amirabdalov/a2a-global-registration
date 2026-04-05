import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { A2ALogo } from "@/components/a2a-logo";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Enter a valid email address", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login-otp", { email });
      const data = await res.json();

      setOtpSent(true);
      setCountdown(60);
      toast({ title: "Verification code sent to your email" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to send code", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLogin = async () => {
    if (otp.length !== 6) { toast({ title: "Enter the 6-digit code", variant: "destructive" }); return; }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/verify-login", { email, otp });
      toast({ title: "Login successful!" });
      setLocation("/dashboard/profile");
    } catch (err: any) {
      toast({ title: err.message || "Verification failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-medium" data-testid="banner-prelaunch">
        Product launch in Q2 2026
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <A2ALogo size="large" />
            </div>
            <p className="text-sm text-muted-foreground">Sign in to your account</p>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-5">
            {!otpSent ? (
              <>
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-center">Sign In with Email</h2>
                <p className="text-sm text-muted-foreground text-center">We'll send a one-time verification code to your email</p>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    data-testid="input-login-email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                  />
                </div>
                <Button data-testid="button-send-otp" className="w-full" onClick={handleSendOtp} disabled={loading} style={{ background: "linear-gradient(135deg, #0F3DD1 0%, #171717 100%)" }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Send Verification Code</span><ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-center">Enter Verification Code</h2>
                <p className="text-sm text-muted-foreground text-center">
                  Code sent to <span className="font-medium text-foreground">{email}</span>
                </p>

                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} data-testid="input-login-otp">
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button data-testid="button-verify-login" onClick={handleVerifyLogin} disabled={loading || otp.length !== 6} className="w-full" style={{ background: "linear-gradient(135deg, #0F3DD1 0%, #171717 100%)" }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                </Button>
                <div className="flex justify-between text-sm">
                  <button onClick={() => { setOtpSent(false); setOtp(""); }} className="text-primary hover:underline" data-testid="button-change-email">
                    Change email
                  </button>
                  <p className="text-muted-foreground">
                    {countdown > 0 ? `Resend in ${countdown}s` : (
                      <button onClick={handleSendOtp} className="text-primary underline" data-testid="button-resend-login">Resend Code</button>
                    )}
                  </p>
                </div>
              </>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" data-testid="button-google-signin" disabled>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign in with Google (Coming Soon)
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-[#0F3DD1] font-medium hover:underline" data-testid="link-signup">Sign up</Link>
          </p>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-400 leading-relaxed">
              A2A Global Inc is a US based technology platform that enables Indian freelancers to generate payment links and receive cross border payments from the US via licensed payment partners.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              © 2026 A2A Global Inc. All rights reserved. File number 10050200, Newark, Delaware, United States.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
