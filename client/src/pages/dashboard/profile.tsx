import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User as UserIcon, Camera, Save, Loader2, MapPin, Globe, CheckCircle2, Circle, Phone, ShieldCheck, Send } from "lucide-react";
import type { User } from "@shared/schema";

function ProfileCompleteness({ profile }: { profile: User }) {
  const steps = [
    { label: "Email verified", done: !!profile.emailVerified },
    { label: "Mobile verified", done: !!profile.mobileVerified },
    { label: "Bio added", done: !!profile.bio && profile.bio.length > 10 },
    { label: "Skills added", done: !!profile.skills && profile.skills.length > 3 },
    { label: "KYC submitted", done: profile.kycStatus !== "not_started" },
  ];

  const completed = steps.filter(s => s.done).length;
  const percentage = Math.round((completed / steps.length) * 100);

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent" data-testid="profile-completeness">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm">Profile Completeness</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {percentage === 100
                ? "Your profile is complete — you're ready to receive tasks and payments."
                : "Complete your profile to unlock tasks and start earning."}
            </p>
          </div>
          <div className="text-2xl font-bold text-primary" data-testid="completeness-percentage">{percentage}%</div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${percentage}%`,
              background: percentage === 100
                ? "#22C55E"
                : "linear-gradient(90deg, #0F3DD1, #22C55E)",
            }}
            data-testid="completeness-bar"
          />
        </div>

        {/* Step checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-sm" data-testid={`completeness-step-${i}`}>
              {step.done ? (
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              )}
              <span className={step.done ? "text-muted-foreground line-through" : "text-foreground font-medium"}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Contextual CTAs */}
        {!profile.mobileVerified && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20" data-testid="mobile-cta">
            <div className="flex items-start gap-2.5">
              <Phone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Complete your profile to stand out
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Explain your domain expertise, add your skills, and optionally verify your mobile number to build trust with clients.
                </p>
              </div>
            </div>
          </div>
        )}
        {profile.mobileVerified && profile.kycStatus === "not_started" && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" data-testid="kyc-cta">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  To get paid, complete your KYC
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Payment regulations require identity verification before any funds can be released. Submit your documents to start receiving payments.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { toast } = useToast();
  const { data: profile, isLoading } = useQuery<User>({ queryKey: ["/api/user/profile"] });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [timezone, setTimezone] = useState("");
  const [language, setLanguage] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Mobile verification state
  const [countryCode, setCountryCode] = useState("91");
  const [mobileInput, setMobileInput] = useState("");
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileLoading, setMobileLoading] = useState(false);

  if (profile && !initialized) {
    setFirstName(profile.firstName || "");
    setLastName(profile.lastName || "");
    setBio(profile.bio || "");
    setSkills(profile.skills || "");
    setTimezone(profile.timezone || "Asia/Kolkata");
    setLanguage(profile.language || "en");
    if (profile.mobile) setMobileInput(profile.mobile.replace("+91", ""));
    setInitialized(true);
  }

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/user/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      toast({ title: "Profile updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    mutation.mutate({ firstName, lastName, bio, skills, timezone, language });
  };

  const handleSendMobileOtp = async () => {
    if (!mobileInput || mobileInput.length < 10) {
      toast({ title: "Enter a valid 10-digit mobile number", variant: "destructive" });
      return;
    }
    setMobileLoading(true);
    try {
      // Send SMS OTP via MSG91 — mobile includes country code
      await apiRequest("POST", "/api/auth/send-mobile-otp", { mobile: "+" + countryCode + mobileInput });
      setMobileOtpSent(true);
      toast({ title: "Verification code sent via SMS" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to send code", variant: "destructive" });
    } finally {
      setMobileLoading(false);
    }
  };

  const handleVerifyMobile = async () => {
    if (mobileOtp.length !== 6) return;
    setMobileLoading(true);
    try {
      await apiRequest("POST", "/api/auth/verify-mobile-otp", { mobile: "+" + countryCode + mobileInput, otp: mobileOtp });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      setMobileOtpSent(false);
      setMobileOtp("");
      toast({ title: "Mobile number verified!" });
    } catch (err: any) {
      toast({ title: err.message || "Verification failed", variant: "destructive" });
    } finally {
      setMobileLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl overflow-y-auto h-full" data-testid="page-profile">
      <div>
        <h1 className="text-xl font-semibold" data-testid="heading-profile">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal information and preferences</p>
      </div>

      {/* Profile Completeness */}
      {profile && <ProfileCompleteness profile={profile} />}

      {/* Photo & Basic Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center relative group" data-testid="avatar-upload">
                <UserIcon className="w-10 h-10 text-primary" />
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">Click to upload</span>
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>First Name</Label>
                  <Input data-testid="input-profile-first-name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input data-testid="input-profile-last-name" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input value={profile?.email || ""} disabled className="bg-muted" />
                {profile?.emailVerified && <Badge variant="secondary" className="mt-1 text-[#22C55E] bg-[#22C55E]/10 text-xs">Verified</Badge>}
              </div>

              {/* Mobile with inline verification */}
              <div>
                <Label className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Mobile Number
                </Label>
                {profile?.mobileVerified ? (
                  <>
                    <Input value={profile?.mobile || ""} disabled className="bg-muted" />
                    <Badge variant="secondary" className="mt-1 text-[#22C55E] bg-[#22C55E]/10 text-xs">Verified</Badge>
                  </>
                ) : !mobileOtpSent ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <select
                        data-testid="select-country-code"
                        value={countryCode}
                        onChange={e => setCountryCode(e.target.value)}
                        className="flex h-10 items-center rounded-md border border-input bg-background px-2 text-sm font-medium min-w-[72px]"
                      >
                        <option value="91">+91 IN</option>
                        <option value="1">+1 US</option>
                        <option value="44">+44 UK</option>
                        <option value="49">+49 DE</option>
                        <option value="33">+33 FR</option>
                        <option value="61">+61 AU</option>
                        <option value="81">+81 JP</option>
                        <option value="86">+86 CN</option>
                        <option value="65">+65 SG</option>
                        <option value="971">+971 AE</option>
                        <option value="966">+966 SA</option>
                        <option value="7">+7 RU</option>
                        <option value="55">+55 BR</option>
                        <option value="234">+234 NG</option>
                        <option value="254">+254 KE</option>
                        <option value="63">+63 PH</option>
                        <option value="62">+62 ID</option>
                        <option value="92">+92 PK</option>
                        <option value="880">+880 BD</option>
                        <option value="94">+94 LK</option>
                      </select>
                      <Input
                        data-testid="input-mobile-number"
                        value={mobileInput}
                        onChange={e => setMobileInput(e.target.value.replace(/\D/g, "").slice(0, 15))}
                        placeholder="Mobile number"
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        data-testid="button-send-mobile-otp"
                        onClick={handleSendMobileOtp}
                        disabled={mobileLoading || mobileInput.length < 10}
                        className="shrink-0"
                      >
                        {mobileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1.5" />Verify</>}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 mt-1">
                    <p className="text-sm text-muted-foreground">
                      Code sent to +{countryCode}{mobileInput}
                    </p>

                    <div className="flex items-center gap-3">
                      <InputOTP maxLength={6} value={mobileOtp} onChange={setMobileOtp} data-testid="input-mobile-verify-otp">
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                      <Button
                        size="sm"
                        data-testid="button-confirm-mobile"
                        onClick={handleVerifyMobile}
                        disabled={mobileLoading || mobileOtp.length !== 6}
                      >
                        {mobileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                      </Button>
                    </div>
                    <button
                      onClick={() => { setMobileOtpSent(false); setMobileOtp(""); setDevOtp(""); }}
                      className="text-xs text-primary hover:underline"
                      data-testid="button-change-mobile"
                    >
                      Change number
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio & Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Professional Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Bio</Label>
            <Textarea data-testid="input-bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell clients about your experience and expertise..." rows={3} />
          </div>
          <div>
            <Label>Skills (comma-separated)</Label>
            <Input data-testid="input-skills" value={skills} onChange={e => setSkills(e.target.value)} placeholder="Python, Machine Learning, Data Annotation, React..." />
            {skills && (
              <div className="flex flex-wrap gap-1 mt-2">
                {skills.split(",").map((s, i) => s.trim() && (
                  <Badge key={i} variant="secondary" className="text-xs">{s.trim()}</Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger data-testid="select-timezone"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                  <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger data-testid="select-language"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="ta">Tamil</SelectItem>
                  <SelectItem value="te">Telugu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button data-testid="button-save-profile" onClick={handleSave} disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Save Changes
      </Button>
    </div>
  );
}
