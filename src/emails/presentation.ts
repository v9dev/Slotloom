export const emailPresentation: Record<
  string,
  { label: string; heading: string; actionLabel?: string }
> = {
  received: {
    label: "Availability received",
    heading: "Thanks, we have your preferred time",
    actionLabel: "Review availability",
  },
  meeting_details: {
    label: "Meeting confirmed",
    heading: "Your meeting is ready",
    actionLabel: "Join meeting",
  },
  rescheduled_confirmation: {
    label: "New meeting confirmed",
    heading: "Here is your rescheduled meeting confirmation",
    actionLabel: "Join meeting",
  },
  reminder: {
    label: "A friendly reminder",
    heading: "We are looking forward to seeing you",
    actionLabel: "Join meeting",
  },
  missed: {
    label: "We missed you",
    heading: "We will arrange another meeting soon",
  },
  reschedule: {
    label: "Rescheduling your meeting",
    heading: "We need to choose a new meeting time",
    actionLabel: "Choose another time",
  },
  cancelled: {
    label: "Meeting cancelled",
    heading: "Your meeting has been cancelled",
  },
};

export function presentationFor(template: string) {
  return (
    emailPresentation[template] || {
      label: "Meeting update",
      heading: "An update about your meeting",
      actionLabel: "View meeting",
    }
  );
}
