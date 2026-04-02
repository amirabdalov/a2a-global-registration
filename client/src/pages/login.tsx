import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { A2ALogo } from "@/components/a2a-logo";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, Lock } from "lucide-react";
import { SiGoogle } from "react-icons/si";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Email and password are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      const data = await res.json();
      setUser(data.user);
      toast({ title: "Welcome back!" });
      setLocation("/dashboard/profile");
    } catch (err: any) {
      toast({ title: err.message || "Login failed", variant: "destructive" });
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
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <A2ALogo size="large" />
            </div>
            <p className="text-sm text-muted-foreground">Sign in to your account</p>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="login-email" type="email" data-testid="input-login-email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="login-password">Password</Label>
                  <a href="#" className="text-xs text-primary hover:underline" data-testid="link-forgot-password">Forgot Password?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="login-password" type="password" data-testid="input-login-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pl-10" />
                </div>
              </div>
              <Button type="submit" data-testid="button-login" className="w-full" disabled={loading} style={{ background: "linear-gradient(135deg, #0F3DD1 0%, #171717 100%)" }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or continue with</span></div>
            </div>

            <Button variant="outline" className="w-full" data-testid="button-google-login">
              <SiGoogle className="w-4 h-4 mr-2" /> Sign in with Google
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-primary font-medium hover:underline" data-testid="link-signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
