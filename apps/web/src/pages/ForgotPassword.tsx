import { useState } from 'react';
import { Link } from 'react-router-dom';
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

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword = () => {
  const [submitted, setSubmitted] = useState(false);
  const requestResetMutation = trpc.passwordReset.requestReset.useMutation();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      await requestResetMutation.mutateAsync(values);
      setSubmitted(true);
    } catch (err) {
      console.error('Password reset request failed:', err);
      // Still show success message for security (prevent user enumeration)
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-accent-cyan">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-display text-center text-accent-cyan">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-center">
              Password reset instructions sent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-green-950/50 border border-green-500/50 p-4">
              <p className="text-sm text-green-400">
                If an account exists with that email address, we've sent password reset
                instructions to it. Please check your inbox and spam folder.
              </p>
            </div>

            <div className="space-y-2 text-sm text-text-secondary">
              <p className="font-medium">What to do next:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Check your email inbox</li>
                <li>Look for an email from TCG Tracker</li>
                <li>Click the reset link (expires in 1 hour)</li>
                <li>Create your new password</li>
              </ul>
            </div>

            <div className="pt-4 text-center text-sm">
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
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-accent-cyan">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-display text-center text-accent-cyan">
            Reset Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={requestResetMutation.isPending}
              >
                {requestResetMutation.isPending
                  ? 'Sending...'
                  : 'Send Reset Link'}
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
