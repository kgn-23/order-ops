import { redirect } from "next/navigation";

import { getSessionOptional } from "@/app/lib/auth";
import { getDefaultSection } from "@/app/lib/route-access";

export default async function Home() {
  const session = await getSessionOptional();
  if (!session) {
    redirect("/signin");
  }
  const section = getDefaultSection(session.roles);
  redirect(`/${section}/dashboard`);
}
