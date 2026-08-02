export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}) {
  // Allow password-recovery deep links to reach the update-password screen
  // instead of always redirecting to the home tab.
  if (path.includes("/auth/update-password")) {
    return path;
  }
  return "/";
}
