import { formatDuration, type SiteAnalysis } from "./analysis";

export function missionSummary(selected: SiteAnalysis, alternatives: SiteAnalysis[]) {
  const first = `${selected.site.name} has ${(selected.illumination * 100).toFixed(0)}% sunlight and ${(selected.earthVisibility * 100).toFixed(0)}% Earth visibility in this window.`;
  const best = alternatives[0];
  const next =
    best && best.site.id !== selected.site.id
      ? `${best.site.name} ranks higher for your current comparison; at the selected site, allow for up to ${formatDuration(selected.longestDarkHours)} of darkness and ${formatDuration(selected.longestGapHours)} without Earth visibility.`
      : `Allow for up to ${formatDuration(selected.longestDarkHours)} of darkness and ${formatDuration(selected.longestGapHours)} without Earth visibility; battery capacity and radio-link margins still need separate checks.`;
  return `${first} ${next}`;
}
