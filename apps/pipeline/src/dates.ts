export function today(): string {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
}
