// Family Pilot — profile selector shell (WP5A).
//
// Chooses WHOSE WEEK IS DISPLAYED. This is display and attribution only: it is
// never sent as an authorization input, and changing it writes nothing to the
// database. Authority always derives from the authenticated actor, re-checked
// server-side (ADR-035).
//
// This is the shell only — the weekly chores view itself is WP5D.
import { PersonAvatar } from "@/components/design-system";
import type { PerspectiveProfile } from "@/lib/pilot/perspective";

export interface ProfileSelectorProps {
  profiles: ReadonlyArray<PerspectiveProfile>;
  selectedPerspectiveProfile: PerspectiveProfile | null;
  onSelectPerspective: (profile: PerspectiveProfile) => void;
}

export function ProfileSelector({
  profiles,
  selectedPerspectiveProfile,
  onSelectPerspective,
}: ProfileSelectorProps) {
  return (
    <section aria-labelledby="pilot-perspective-heading">
      <h2 id="pilot-perspective-heading" className="text-sm font-medium text-muted-foreground">
        במי מציגים?
      </h2>

      {/* radiogroup, not a list of buttons: a screen reader then announces
          "selected 1 of 4" rather than four unrelated controls. */}
      <div
        role="radiogroup"
        aria-labelledby="pilot-perspective-heading"
        className="mt-3 grid grid-cols-2 gap-2"
      >
        {profiles.map((profile) => {
          const selected = profile.id === selectedPerspectiveProfile?.id;
          return (
            <button
              key={profile.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelectPerspective(profile)}
              className={[
                "flex min-h-[44px] items-center gap-3 rounded-lg border p-3 text-start transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-input bg-background hover:bg-accent",
              ].join(" ")}
            >
              <PersonAvatar name={profile.displayName} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {profile.displayName}
                </span>
                {/* Role conveyed as text, never by colour alone. */}
                <span className="block text-xs text-muted-foreground">
                  {profile.isChild ? "ילד/ה" : "מבוגר/ת"}
                  {selected ? " · נבחר/ה" : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
