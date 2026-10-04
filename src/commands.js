export function parsePrimeCommand(text = "") {
  const command = text.trim();
  const match = command.match(/^\/prime-(on|off|status)(?:@\w+)?$/i);
  return match ? match[1].toLowerCase() : null;
}
