import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyTokenQuery = trpc.passwordReset.verifyToken.useQuery(
    { token: token || '' },
    { enabled: Boolean(token) }
  );

  const resetPasswordMutation = trpc.passwordReset.resetPassword.useMutation();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!token) {
      setTokenError('No reset token provided');
      setVerifying(false);
      return;
    }

    if (verifyTokenQuery.data) {
      if (!verifyTokenQuery.data.valid) {
        setTokenError('error' in verifyTokenQuery.data ? verifyTokenQuery.data.error : 'Invalid token');
      }
      setVerifying(false);
    }

    if (verifyTokenQuery.error) {
      setTokenError('Failed to verify reset link');
      setVerifying(false);
    }
  }, [token, verifyTokenQuery.data, verifyTokenQuery.error]);

  useEffect(() => {
    if (resetSuccess) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [resetSuccess, navigate]);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) return;

    setError(null);
    try {
      await resetPasswordMutation.mutateAsync({
        token,
        password: values.password,
      });
      setResetSuccess(true);
    } catch (err) {
      console.error('Password reset failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset password. Please try again.');
    }
  };

  // Loading state
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-accent-cyan">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-text-secondary">Verifying reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-accent-cyan">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-display text-center text-accent-cyan">
              Password Reset Successful
            </CardTitle>
            <CardDescription className="text-center">
              Your password has been updated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-green-950/50 border border-green-500/50 p-4">
              <p className="text-sm text-green-400">
                Your password has been successfully reset. You can now log in with your new
                password.
              </p>
            </div>

            <p className="text-center text-sm text-text-secondary">
              Redirecting to login page in 3 seconds...
            </p>

            <Button
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-accent-cyan">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-display text-center text-accent-cyan">
              Invalid Reset Link
            </CardTitle>
            <CardDescription className="text-center">
              This password reset link is not valid
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-red-950/50 border border-red-500/50 p-4">
              <p className="text-sm text-red-400">{tokenError}</p>
            </div>

            <div className="space-y-2 text-sm text-text-secondary">
              <p className="font-medium">Possible reasons:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>The link has expired (links are valid for 1 hour)</li>
                <li>The link has already been used</li>
                <li>The link is malformed or incomplete</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => navigate('/forgot-password')}
              >
                Request New Reset Link
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-accent-cyan">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-display text-center text-accent-cyan">
            Create New Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="rounded-md bg-red-950/50 border border-red-500/50 p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending
                  ? 'Resetting Password...'
                  : 'Reset Password'}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm">
            <Link
              to="/login"
              className="text-accent-cyan hover:text-accent-lavender transition-colors"
            >
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
