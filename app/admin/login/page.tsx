import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  let session = null;
  try {
    session = await getAdminSession();
  } catch {
    session = null;
  }
  if (session) {
    redirect("/admin");
  }
  return <LoginForm />;
}
