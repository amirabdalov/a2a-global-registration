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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User as UserIcon, Camera, Save, Loader2, MapPin, Globe } from "lucide-react";
import type { User } from "@shared/schema";

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

  if (profile && !initialized) {
    setFirstName(profile.firstName || "");
    setLastName(profile.lastName || "");
    setBio(profile.bio || "");
    setSkills(profile.skills || "");
    setTimezone(profile.timezone || "Asia/Kolkata");
    setLanguage(profile.language || "en");
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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
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
              <div>
                <Label>Phone</Label>
                <Input value={profile?.mobile || ""} disabled className="bg-muted" />
                {profile?.mobileVerified && <Badge variant="secondary" className="mt-1 text-[#22C55E] bg-[#22C55E]/10 text-xs">Verified</Badge>}
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
