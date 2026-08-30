import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import * as db from "@/lib/db";
import { UserAvatar } from "@/components/common/UserAvatar";
import { VerificationBadge } from "@/components/common/VerificationBadge";
import { BotBadge } from "@/components/common/BotBadge";

export function Search() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQuery(q);
  }, [searchParams]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return db
      .getUsers()
      .filter((u) => u.username.toLowerCase().includes(q))
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [query]);

  return (
    <div className="space-y-4">
      <h1 className="px-1 text-xl font-bold">{t("search.title")}</h1>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("search.placeholder")}
        className="h-11"
        autoFocus
      />

      {query.trim() === "" ? (
        <p className="px-1 text-xs text-muted-foreground">{t("search.hint")}</p>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <SearchX className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("search.empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((u) => (
            <Link
              key={u.id}
              to={`/u/${u.username}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft transition-all hover:border-foreground/30"
            >
              <UserAvatar user={u} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-sm font-semibold">@{u.username}</p>
                  {u.isBot ? <BotBadge /> : u.verified && <VerificationBadge />}
                </div>
                <p className="truncate text-xs text-muted-foreground">{u.fullName}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
export default Search;