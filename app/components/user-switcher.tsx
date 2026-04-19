"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { DemoUserKey } from "@/lib/session";

async function persistProfile(as: DemoUserKey) {
  const res = await fetch("/api/session/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ as }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to switch profile");
  }
}

type UserSwitcherProps = {
  activeUserKey: DemoUserKey;
};

export default function UserSwitcher({ activeUserKey }: UserSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSwitch = (nextAs: DemoUserKey) => {
    if (nextAs === activeUserKey) return;

    startTransition(async () => {
      await persistProfile(nextAs);
      router.replace(pathname);
      router.refresh();
    });
  };

  return (
    <div className="fixed top-4 right-4 flex gap-2 z-50">
      {[
        { key: "alice", label: "Brian" },
        { key: "bob", label: "George" },
      ].map((user) => {
        const active = activeUserKey === user.key;
        return (
          <button
            key={user.key}
            type="button"
            onClick={() => handleSwitch(user.key as DemoUserKey)}
            disabled={isPending && !active}
            className="px-3.5 py-1.5 rounded-full text-[10px] tracking-[0.1em] uppercase transition-all duration-300 disabled:opacity-60"
            style={{
              background: active ? "var(--fg)" : "rgba(255,255,255,0.7)",
              color: active ? "var(--bg)" : "var(--muted)",
              border: active ? "none" : "1px solid var(--border)",
              backdropFilter: active ? "none" : "blur(12px)",
              fontWeight: active ? 600 : 400,
            }}
            aria-pressed={active}
          >
            {user.label}
          </button>
        );
      })}
    </div>
  );
}
