import { redirect } from "next/navigation";

import { getSessionOptional } from "@/lib/auth";
import { getDefaultSection } from "@/lib/route-access";
import { SignInForm } from "@/components/auth/signin-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SignInPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const currentSession = await getSessionOptional();
  if (currentSession) {
    const section = getDefaultSection(currentSession.roles);
    redirect(`/${section}/dashboard`);
  }

  const params = (await searchParams) ?? {};
  const hasInvalidCredentials = params.error === "invalid_credentials";

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md items-center p-4 md:p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Enter your email and password to continue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasInvalidCredentials ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
              Invalid email or password.
            </p>
          ) : null}

          <SignInForm />
        </CardContent>
      </Card>
    </main>
  );
}
