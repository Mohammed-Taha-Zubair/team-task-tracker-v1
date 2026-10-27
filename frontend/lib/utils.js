// Helper to format ISO timestamp into human-readable relative time (no external library)
export function formatRelativeTime(dateString) {
  if (!dateString) return "";

  // Append 'Z' if timezone offset is not explicitly provided so Date parses as UTC
  const iso = dateString.endsWith("Z") || dateString.includes("+") ? dateString : `${dateString}Z`;
  const date = new Date(iso);
  const now = new Date();

  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 10) {
    return "just now";
  }
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? "1 min ago" : `${diffInMinutes} min ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? "1 hr ago" : `${diffInHours} hrs ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? "1 mo ago" : `${diffInMonths} mos ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return diffInYears === 1 ? "1 yr ago" : `${diffInYears} yrs ago`;
}
