import type { AppView } from './tracking/types';

const TRACKING_DAY_RE = /^\/tracking\/([^/]+)\/day\/(\d+)$/;
const TRACKING_RE = /^\/tracking\/([^/]+)$/;

export function pathToView(pathname: string): AppView {
  const dayMatch = pathname.match(TRACKING_DAY_RE);
  if (dayMatch) {
    return { tracking: dayMatch[1], day: Number(dayMatch[2]) };
  }
  const match = pathname.match(TRACKING_RE);
  if (match) {
    return { tracking: match[1] };
  }
  // Also handle /tracking/:id/day/<non-numeric> → tracking without day
  const partialDayMatch = pathname.match(/^\/tracking\/([^/]+)\/day\/[^/]+$/);
  if (partialDayMatch) {
    return { tracking: partialDayMatch[1] };
  }
  return 'planner';
}

export function viewToPath(view: AppView): string {
  if (typeof view === 'object') {
    if (view.day != null) {
      return `/tracking/${view.tracking}/day/${view.day}`;
    }
    return `/tracking/${view.tracking}`;
  }
  return '/';
}

export function pushView(view: AppView): void {
  const path = viewToPath(view);
  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path);
  }
}
