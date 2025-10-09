import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { z } from 'zod';

// Password validation schema
const passwordSchema = z.string()
  .min(10, 'Password must be at least 10 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });
    fetchCompanyLogo();
  }, [navigate]);

  const fetchCompanyLogo = async () => {
    const { data } = await supabase
      .from('settings')
      .select('app_logo_url')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    
    if (data?.app_logo_url) {
      setCompanyLogoUrl(data.app_logo_url);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPasswordError(null);

    // Validate password
    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      setPasswordError(passwordValidation.error.errors[0].message);
      setLoading(false);
      toast({
        title: t('validationError'),
        description: passwordValidation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      toast({
        title: t('error'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t('success'),
        description: t('accountCreated'),
      });
      navigate('/');
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: t('error'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          {companyLogoUrl && (
            <div className="flex justify-center mb-4">
              <img 
                src={companyLogoUrl} 
                alt="Company Logo" 
                className="max-h-20 max-w-full object-contain"
              />
            </div>
          )}
          <CardTitle className="text-2xl text-center">
            {t('signIn')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {passwordError && (
                <p className="text-sm text-destructive mt-1">{passwordError}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Password requirements: 10+ characters, uppercase, lowercase, digit, and special character
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('loading') : t('signIn')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
