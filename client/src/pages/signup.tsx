import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { A2ALogo } from "@/components/a2a-logo";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, setSessionToken } from "@/lib/queryClient";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail, Shield } from "lucide-react";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Step 1 fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);

  // Step 2
  const [termsAccepted, setTermsAccepted] = useState(false);

  // OTP
  const [emailOtp, setEmailOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const validateStep1 = () => {
    if (!firstName.trim()) { toast({ title: "First name is required", variant: "destructive" }); return false; }
    if (!lastName.trim()) { toast({ title: "Last name is required", variant: "destructive" }); return false; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast({ title: "Valid email is required", variant: "destructive" }); return false; }
    return true;
  };

  const handleRegister = async () => {
    if (!termsAccepted) { toast({ title: "You must accept the Terms of Use and Privacy Policy", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/register", {
        firstName, lastName, email, referralCode, whatsappOptIn,
      });
      const data = await res.json();
      setUserId(data.userId);
      setCountdown(60);
      setStep(3);
      toast({ title: "Account created! Check your email for a verification code." });
    } catch (err: any) {
      toast({ title: err.message || "Registration failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (emailOtp.length !== 6) { toast({ title: "Enter the 6-digit code", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const verifyRes = await apiRequest("POST", "/api/auth/verify-email", { email, otp: emailOtp });
      const verifyData = await verifyRes.json();
      if (verifyData.token) {
        setSessionToken(verifyData.token);
      }
      toast({ title: "Email verified! Welcome to A2A Global." });
      // Go directly to dashboard — no intermediate success screen
      window.location.hash = "#/dashboard/profile";
    } catch (err: any) {
      toast({ title: err.message || "Verification failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const res = await apiRequest("POST", "/api/auth/resend-otp", { email, type: "email" });
      await res.json();
      setCountdown(60);
      toast({ title: "Verification code resent" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to resend", variant: "destructive" });
    }
  };

  const totalSteps = 3;
  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-8" data-testid="step-indicator">
      {[1,2,3].map(s => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
            s < step ? "bg-[#22C55E] text-white" :
            s === step ? "bg-primary text-white" :
            "bg-muted text-muted-foreground"
          }`}>
            {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
          </div>
          {s < totalSteps && <div className={`w-8 h-0.5 ${s < step ? "bg-[#22C55E]" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Pre-launch banner */}
      <div className="bg-[#0F3DD1] text-white text-center py-2 text-sm font-medium" data-testid="banner-prelaunch">
        Product launch in Q2 2026
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <A2ALogo size="large" />
            </div>
            <p className="text-sm text-gray-500">Freelancer Registration</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            {stepIndicator}

            {/* STEP 1: Personal Information */}
            {step === 1 && (
              <div className="space-y-4" data-testid="step-personal-info">
                <h2 className="text-lg font-semibold text-center text-gray-900">Personal Information</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" data-testid="input-first-name" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" data-testid="input-last-name" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" data-testid="input-email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <Label htmlFor="referral">Referral Code (optional)</Label>
                  <Input id="referral" data-testid="input-referral" value={referralCode} onChange={e => setReferralCode(e.target.value)} placeholder="A2A-XXXX" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="whatsapp" data-testid="checkbox-whatsapp" checked={whatsappOptIn} onCheckedChange={(c) => setWhatsappOptIn(!!c)} />
                  <Label htmlFor="whatsapp" className="text-sm text-gray-500 cursor-pointer">I want to receive updates via WhatsApp</Label>
                </div>
                <Button data-testid="button-next-step" className="w-full bg-[#0F3DD1] hover:bg-[#0D35B8] text-white" onClick={() => validateStep1() && setStep(2)}>
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* STEP 2: Terms Acceptance */}
            {step === 2 && (
              <div className="space-y-4" data-testid="step-terms">
                <h2 className="text-lg font-semibold text-center flex items-center justify-center gap-2 text-gray-900">
                  <Shield className="w-5 h-5 text-[#0F3DD1]" /> Terms & Privacy
                </h2>
                <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto text-sm text-gray-600 space-y-3" data-testid="terms-scroll-area">
                  <p className="font-medium text-gray-900">Terms of Use — March 2026 v4</p>
                  <p>By registering on A2A Global, you agree to provide accurate information and comply with all applicable laws. A2A Global connects US corporate payers with Indian freelancers for AI-related tasks including data annotation, model review, and code review.</p>
                  <p>You acknowledge that A2A Global acts as a marketplace facilitator and does not guarantee continuous availability of tasks. Payment processing is subject to compliance with international financial regulations.</p>
                  <p className="font-medium text-gray-900 mt-4">Privacy Policy — March 2026 v3.2</p>
                  <p>We collect personal information including name, email, mobile number, and identity documents for KYC compliance. Your data is processed in accordance with applicable privacy laws and is shared only as necessary for payment processing and legal compliance.</p>
                  <p>You have the right to access, correct, and delete your personal data. For requests, contact privacy@a2a.global.</p>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="terms" data-testid="checkbox-terms" checked={termsAccepted} onCheckedChange={(c) => setTermsAccepted(!!c)} className="mt-0.5" />
                  <Label htmlFor="terms" className="text-sm cursor-pointer">
                    I have read and accept the{" "}
                    <a href="https://a2a.global/legal/TERMS-OF-USE-A2A-Global-Inc-March-2026-v4.pdf" target="_blank" rel="noopener noreferrer" className="text-[#0F3DD1] underline">Terms of Use</a>{" "}and{" "}
                    <a href="https://a2a.global/legal/PRIVACY-POLICY-A2A-Global-Inc-March-2026-v3-2.pdf" target="_blank" rel="noopener noreferrer" className="text-[#0F3DD1] underline">Privacy Policy</a>
                  </Label>
                </div>
                <p className="text-xs text-gray-400">By accepting, you agree to the legally binding terms. Your acceptance date, time, and IP address will be recorded for compliance purposes.</p>
                <div className="flex gap-3">
                  <Button variant="outline" data-testid="button-back" onClick={() => setStep(1)} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button data-testid="button-create-account" onClick={handleRegister} disabled={loading || !termsAccepted} className="flex-1" style={{ background: "linear-gradient(135deg, #0F3DD1 0%, #171717 100%)" }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Email Verification */}
            {step === 3 && (
              <div className="space-y-4 text-center" data-testid="step-email-verify">
                <div className="w-14 h-14 rounded-full bg-[#0F3DD1]/10 flex items-center justify-center mx-auto">
                  <Mail className="w-7 h-7 text-[#0F3DD1]" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Verify Your Email</h2>
                <p className="text-sm text-gray-500">We've sent a verification code to <span className="font-medium text-gray-900">{email}</span></p>

                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={emailOtp} onChange={setEmailOtp} data-testid="input-email-otp">
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
                <Button data-testid="button-verify-email" onClick={handleVerifyEmail} disabled={loading || emailOtp.length !== 6} className="w-full bg-[#0F3DD1] hover:bg-[#0D35B8] text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Email"}
                </Button>
                <p className="text-sm text-gray-500">
                  {countdown > 0 ? `Resend code in ${countdown}s` : (
                    <button onClick={handleResend} className="text-[#0F3DD1] underline" data-testid="button-resend-email">Resend Code</button>
                  )}
                </p>
              </div>
            )}

            {/* STEP 4: Success */}
            {step === 4 && (
              <div className="space-y-6 text-center py-4" data-testid="step-success">
                <div className="w-20 h-20 rounded-full bg-[#22C55E]/10 flex items-center justify-center mx-auto animate-in zoom-in duration-500">
                  <CheckCircle2 className="w-10 h-10 text-[#22C55E]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Registration Complete!</h2>
                  <p className="text-gray-500 mt-1">Welcome to A2A Global</p>
                </div>
                <Link href="/dashboard/profile">
                  <Button data-testid="button-go-dashboard" className="w-full" style={{ background: "linear-gradient(135deg, #0F3DD1 0%, #171717 100%)" }}>
                    Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {step <= 2 && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-[#0F3DD1] font-medium hover:underline" data-testid="link-login">Sign in</Link>
            </p>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-400 leading-relaxed">
              Connecting businesses with AI experts worldwide. Secure cross-border payments included.
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
