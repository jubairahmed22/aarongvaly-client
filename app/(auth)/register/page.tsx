"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthLayout } from "@/components/layout";
import { Button, Input, Label, Divider } from "@/components/ui";
import { FieldError, PasswordInput, GoogleButton } from "@/components/composed";
import { COMPANY } from "@/lib/entity/company";
import { useUIStore } from "@/store/uiStore";
import { authApi, AuthError } from "@/lib/api/auth";
import { signIn } from "next-auth/react";

const schema = z.object({
  name: z.string().min(2, "At least 2 characters").max(80, "Too long"),
  email: z.string().email("Invalid email"),
  phone: z
    .string()
    .trim()
    .max(20, "Too long")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Needs an uppercase letter")
    .regex(/[a-z]/, "Needs a lowercase letter")
    .regex(/\d/, "Needs a number"),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const toast = useUIStore((s) => s.toast);
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await authApi.register({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        phone: values.phone?.trim() || undefined,
      });
      toast({
        title: "Check your email",
        description: "We sent you a 6-digit verification code.",
        tone: "success",
      });
      router.push(`/verify?email=${encodeURIComponent(values.email.trim().toLowerCase())}`);
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.fieldErrors?.length) {
          for (const fe of err.fieldErrors) {
            const path = fe.path.split(".").pop() as keyof FormValues;
            if (path && (path === "name" || path === "email" || path === "phone" || path === "password")) {
              setError(path, { message: fe.message });
            }
          }
        }
        toast({ title: "Could not create account", description: err.message, tone: "error" });
      } else {
        toast({
          title: "Something went wrong",
          description: "Please try again in a moment.",
          tone: "error",
        });
      }
    } finally {
      setSubmitting(false);
    }
  });

  const oauth = (provider: "google" | "facebook") => {
    signIn(provider, { callbackUrl: "/" });
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle={`Join ${COMPANY.name} in under a minute.`}
      altPrompt={{ question: "Already have an account?", ctaLabel: "Sign in", ctaHref: "/login" }}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-[16px]" noValidate>
        <div className="flex flex-col gap-[6px]">
          <Label htmlFor="name" required>Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Your name"
            invalid={!!errors.name}
            {...register("name")}
          />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="flex flex-col gap-[6px]">
          <Label htmlFor="email" required>Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            invalid={!!errors.email}
            {...register("email")}
          />
          <FieldError message={errors.email?.message} />
        </div>

        <div className="flex flex-col gap-[6px]">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+8801…"
            invalid={!!errors.phone}
            {...register("phone")}
          />
          <FieldError message={errors.phone?.message} />
        </div>

        <div className="flex flex-col gap-[6px]">
          <Label htmlFor="password" required>Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Create a password"
            invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password ? (
            <FieldError message={errors.password.message} />
          ) : (
            <p className="text-[12px] leading-tight text-neutral-500">
              8+ characters, with an uppercase, a lowercase, and a number.
            </p>
          )}
        </div>

        <p className="text-[12px] leading-relaxed text-neutral-500">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="font-semibold text-[#5718C2] underline-offset-2 hover:underline">Terms</Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold text-[#5718C2] underline-offset-2 hover:underline">Privacy Policy</Link>.
        </p>

        <Button type="submit" loading={submitting} fullWidth size="lg" className="rounded-[12px]">
          Create account
        </Button>
      </form>

      <Divider label="or" className="my-[20px]" />

      <GoogleButton onClick={() => oauth("google")} label="Sign up with Google" />
    </AuthLayout>
  );
}
