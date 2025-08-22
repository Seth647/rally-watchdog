import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  open: boolean;
}

export function AuthModal({ open }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rallyNumber, setRallyNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const phoneRegex = /^\+27\d{9}$/;
    if (!phoneRegex.test(phone)) {
      toast({ title: "Invalid phone", description: "Use South African format +27XXXXXXXXX", variant: "destructive" });
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      const user = data.user;
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({ id: user.id, rally_number: rallyNumber, phone });
        if (profileError) {
          toast({ title: "Profile setup failed", description: profileError.message, variant: "destructive" });
        }
      }
      toast({ title: "Check your email", description: "Confirm your account via the email sent." });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>{isSignUp ? "Sign Up" : "Sign In"}</DialogTitle>
          <DialogDescription>
            {isSignUp ? "Create an account to submit reports." : "Sign in to continue."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {isSignUp && (
            <>
              <div className="space-y-2">
                <Label htmlFor="rallyNumber">Rally Number</Label>
                <Input id="rallyNumber" value={rallyNumber} onChange={(e) => setRallyNumber(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (+27)</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+27XXXXXXXXX"
                  required
                />
              </div>
            </>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}
          <Button
            variant="link"
            className="px-1"
            onClick={() => setIsSignUp((prev) => !prev)}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </Button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
