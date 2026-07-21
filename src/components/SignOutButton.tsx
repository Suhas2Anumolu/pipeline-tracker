"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex items-center gap-1 text-sm text-muted hover:text-ink"
    >
      <LogOut size={14} /> Sign out
    </button>
  );
}
