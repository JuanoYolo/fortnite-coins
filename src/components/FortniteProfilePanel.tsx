import type { ProfileResponse } from "../types";

interface FortniteProfilePanelProps {
  profile: ProfileResponse;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function modeColor(mode: string): string {
  if (mode === "solo") return "mode-badge solo";
  if (mode === "duo") return "mode-badge duo";
  if (mode === "trio") return "mode-badge trio";
  return "mode-badge squad";
}

export default function FortniteProfilePanel({ profile }: FortniteProfilePanelProps) {
  const maxLevel = 200;
  const level = profile.overview.battlePassLevel ?? 0;
  const progress = Math.max(0, Math.min(100, (level / maxLevel) * 100));

  return (
    <section className="profile-panel">
      <h3>Fortnite Tracker Snapshot</h3>

      <div className="overview-grid">
        <article className="overview-card">
          <span>Win Rate</span>
          <strong>{formatPercent(profile.overview.winRate)}</strong>
        </article>
        <article className="overview-card">
          <span>KD</span>
          <strong>{profile.overview.kd.toFixed(2)}</strong>
        </article>
        <article className="overview-card">
          <span>Wins</span>
          <strong>{profile.overview.wins}</strong>
        </article>
        <article className="overview-card">
          <span>Matches</span>
          <strong>{profile.overview.matches}</strong>
        </article>
      </div>

      <div className="progress-wrap">
        <div className="progress-meta">
          <span>Battle Pass</span>
          <span>Level {level}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="period-grid">
        <article className="period-block">
          <h4>Last 7 Days</h4>
          <p>Wins: {profile.last7.wins}</p>
          <p>KD: {profile.last7.kd.toFixed(2)}</p>
          <p>Kills: {profile.last7.kills}</p>
          <p>Matches: {profile.last7.matches}</p>
        </article>
        <article className="period-block">
          <h4>Last 30 Days</h4>
          <p>Wins: {profile.last30.wins}</p>
          <p>KD: {profile.last30.kd.toFixed(2)}</p>
          <p>Kills: {profile.last30.kills}</p>
          <p>Matches: {profile.last30.matches}</p>
        </article>
      </div>

      <div className="mode-list">
        {profile.modes.map((mode) => (
          <div className="mode-row" key={mode.mode}>
            <div className={modeColor(mode.mode)}>{mode.mode.toUpperCase()}</div>
            <div className="mode-stats">
              <span>Wins: {mode.wins}</span>
              <span>WR: {formatPercent(mode.winRate)}</span>
              <span>KD: {mode.kd.toFixed(2)}</span>
              <span>Kills: {mode.kills}</span>
              <span>Matches: {mode.matches}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
