import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin login - SCET Feedback" };

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  if (isAdmin()) redirect("/");

  return (
    <div className="wrap" style={{ maxWidth: 420, marginTop: 60 }}>
      <div className="card">
        <h2>Admin login</h2>
        <form method="POST" action="/api/admin/login">
          <label className="field">
            Password
            <input type="password" name="password" required autoFocus autoComplete="current-password" />
          </label>
          {searchParams.error && <p className="error">Incorrect password.</p>}
          <p>
            <button type="submit">Sign in</button>
          </p>
        </form>
      </div>
    </div>
  );
}
