export class IntegrationError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}

export function providerCalendarFailure(label: string, response: Response) {
  if (response.status === 401)
    return new IntegrationError(`Reconnect ${label} to continue.`, 409);
  if (response.status === 403)
    return new IntegrationError(
      `${label} denied calendar access. Check the granted scopes and account license.`,
      409,
    );
  return new IntegrationError(
    `${label} could not update the calendar event. Try again.`,
    502,
  );
}
