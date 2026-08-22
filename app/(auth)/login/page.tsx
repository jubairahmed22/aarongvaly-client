"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthLayout } from "@/components/layout";
import { Button, Input, Label, Divider } from "@/components/ui";
import { FieldError, PasswordInput, GoogleButton } from "@/components/composed";
import { COMPANY } from "@/lib/entity/company";
import { useUIStore } from "@/store/uiStore";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Required"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  // Accept either ?from= (legacy) or ?next= (used by account/* and reviews)
  // so deep-link bounces from any guarded surface land back where the user
  // started.
  const from = params.get("from") ?? params.get("next") ?? "/";
  const verified = params.get("verified") === "1";
  const presetEmail = params.get("email") ?? "";
  const toast = useUIStore((s) => s.toast);

  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: presetEmail, password: "" },
  });

  // One-shot success toast when arriving from /verify.
  const shownVerifiedToast = React.useRef(false);
  React.useEffect(() => {
    if (verified && !shownVerifiedToast.current) {
      shownVerifiedToast.current = true;
      toast({
        title: "Email verified",
        description: "Sign in to finish setting up your account.",
        tone: "success",
      });
    }
  }, [verified, toast]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    const res = await signIn("credentials", {
      ...values,
      redirect: false,
    });
    setSubmitting(false);

    if (!res || res.error) {
      toast({
        title: "Sign in failed",
        description: "Check your email and password, then try again.",
        tone: "error",
      });
      return;
    }
    router.push(from);
    router.refresh();
  });

  const oauth = (provider: "google" | "facebook") => {
    signIn(provider, { callbackUrl: from });
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={`Sign in to your ${COMPANY.name} account.`}
      altPrompt={{ question: `New to ${COMPANY.name}?`, ctaLabel: "Create an account", ctaHref: "/register" }}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-[16px]" noValidate>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" required>Password</Label>
            <Link
              href="/forgot-password"
              className="text-[12px] font-semibold text-[#5718C2] underline-offset-2 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Your password"
            invalid={!!errors.password}
            {...register("password")}
          />
          <FieldError message={errors.password?.message} />
        </div>

        <Button type="submit" loading={submitting} fullWidth size="lg" className="mt-[4px] rounded-[12px]">
          Sign in
        </Button>
      </form>

      <Divider label="or" className="my-[20px]" />

      <GoogleButton onClick={() => oauth("google")} label="Continue with Google" />
    </AuthLayout>
  );
}
