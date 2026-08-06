import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AttendeeDraft = { name: string; email: string };

export function attendeeDraftError(
  attendees: AttendeeDraft[],
  primaryEmail: string,
) {
  const seen = new Set([primaryEmail.trim().toLowerCase()]);
  for (const attendee of attendees) {
    const email = attendee.email.trim().toLowerCase();
    if (attendee.name.trim().length < 2)
      return "Enter a name for every attendee.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Enter a valid email for every attendee.";
    if (seen.has(email)) return "Each attendee email must be unique.";
    seen.add(email);
  }
  return "";
}

export function AttendeeEditor({
  attendees,
  onChange,
  maximum = 9,
  description = "They will receive the calendar invitation when the organizer creates the meeting.",
}: {
  attendees: AttendeeDraft[];
  onChange: (attendees: AttendeeDraft[]) => void;
  maximum?: number;
  description?: string;
}) {
  const update = (index: number, field: keyof AttendeeDraft, value: string) =>
    onChange(
      attendees.map((attendee, candidate) =>
        candidate === index ? { ...attendee, [field]: value } : attendee,
      ),
    );
  return (
    <div className="space-y-3">
      <div>
        <Label>Additional attendees</Label>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      {attendees.map((attendee, index) => (
        <div
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] gap-2"
          key={index}
        >
          <Input
            aria-label={`Attendee ${index + 1} name`}
            autoComplete="name"
            placeholder="Name"
            value={attendee.name}
            onChange={(event) => update(index, "name", event.target.value)}
          />
          <Input
            aria-label={`Attendee ${index + 1} email`}
            autoComplete="email"
            placeholder="email@example.com"
            type="email"
            value={attendee.email}
            onChange={(event) => update(index, "email", event.target.value)}
          />
          <Button
            aria-label={`Remove attendee ${index + 1}`}
            onClick={() =>
              onChange(attendees.filter((_, candidate) => candidate !== index))
            }
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button
        disabled={attendees.length >= maximum}
        onClick={() => onChange([...attendees, { name: "", email: "" }])}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus />
        Add attendee
      </Button>
      <p className="text-xs text-muted-foreground">
        {attendees.length} of {maximum} additional attendees
      </p>
    </div>
  );
}
