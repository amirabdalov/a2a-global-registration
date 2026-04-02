import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, Send, MessageSquare, Inbox } from "lucide-react";

const faqs = [
  { q: "How do I get started as a freelancer?", a: "Complete your registration, verify your email and mobile, then submit your KYC documents. Once verified, you can browse and apply to available tasks." },
  { q: "How does payment work?", a: "Payments are processed in USD. Once you complete a task and it's approved, funds are added to your balance. You can request a payout to your bank account or UPI." },
  { q: "What is 'Second Opinion for AI'?", a: "It's our core service where freelancers provide human expert review of AI-generated outputs. Tasks include data annotation quality checks, AI model output evaluation, code reviews, and ML pipeline QA." },
  { q: "How long does KYC verification take?", a: "KYC verification typically takes 1-3 business days after you submit all required documents (PAN Card, Aadhaar/Passport, UPI ID, and bank details)." },
  { q: "Can I work from anywhere in India?", a: "Yes! A2A Global is fully remote. You can work from anywhere as long as you have a stable internet connection." },
  { q: "How do referrals work?", a: "Share your unique referral link. When someone registers through your link and completes their first task, you earn a referral bonus." },
];

export default function SupportPage() {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmitTicket = () => {
    if (!subject.trim() || !message.trim()) {
      toast({ title: "Please fill in subject and message", variant: "destructive" });
      return;
    }
    toast({ title: "Support ticket submitted successfully" });
    setSubject("");
    setMessage("");
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl overflow-y-auto h-full" data-testid="page-support">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="heading-support">
          <HelpCircle className="w-5 h-5 text-primary" /> Support
        </h1>
        <p className="text-sm text-muted-foreground">Get help and find answers</p>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible data-testid="faq-accordion">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm text-left" data-testid={`faq-trigger-${i}`}>{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground" data-testid={`faq-content-${i}`}>{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Submit a Ticket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Subject</Label>
            <Input data-testid="input-ticket-subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description of your issue" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea data-testid="input-ticket-message" value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue in detail..." rows={4} />
          </div>
          <Button onClick={handleSubmitTicket} data-testid="button-submit-ticket">
            <Send className="w-4 h-4 mr-2" /> Submit Ticket
          </Button>
        </CardContent>
      </Card>

      {/* Ticket List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No tickets yet</p>
            <p className="text-sm">Submit a ticket above if you need help</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
