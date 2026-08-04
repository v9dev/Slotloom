import { Globe2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const commonTimeZones = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function supportedTimeZones() {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return commonTimeZones;
  }
}

export function TimeZoneSelect({
  value,
  defaultValue,
  onValueChange,
  name,
  label = "Select time zone",
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  label?: string;
}) {
  const detected = browserTimeZone();
  const current = value || defaultValue || detected;
  const zones = Array.from(
    new Set([detected, current, ...commonTimeZones, ...supportedTimeZones()]),
  ).sort((a, b) => a.localeCompare(b));
  return (
    <Select
      name={name}
      value={value}
      defaultValue={defaultValue || (!value ? detected : undefined)}
      onValueChange={onValueChange}
    >
      <SelectTrigger aria-label={label} className="w-full bg-background">
        <Globe2 className="text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {zones.map((zone) => (
          <SelectItem key={zone} value={zone}>
            {zone.replaceAll("_", " ")}
            {zone === detected ? " — detected" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
