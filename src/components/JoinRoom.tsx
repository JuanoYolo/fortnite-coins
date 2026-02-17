import { useMemo, useState } from "react";

interface JoinRoomValues {
  room_code: string;
  display_name: string;
  player_code: string;
}

interface JoinRoomProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  initialValues?: Partial<JoinRoomValues>;
  onSubmit: (values: JoinRoomValues) => void;
}

export default function JoinRoom({ open, loading, error, initialValues, onSubmit }: JoinRoomProps) {
  const [roomCode, setRoomCode] = useState(initialValues?.room_code ?? "");
  const [displayName, setDisplayName] = useState(initialValues?.display_name ?? "");
  const [playerCode, setPlayerCode] = useState(initialValues?.player_code ?? "");

  const isDisabled = useMemo(
    () =>
      loading ||
      roomCode.trim().length < 2 ||
      displayName.trim().length < 2 ||
      playerCode.trim().length < 2,
    [displayName, loading, playerCode, roomCode]
  );

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" aria-modal="true" role="dialog" aria-label="Join room">
        <h2>Join Room</h2>
        <p className="muted">Enter your room and PIN to trade.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({
              room_code: roomCode.trim(),
              display_name: displayName.trim(),
              player_code: playerCode.trim()
            });
          }}
        >
          <label className="field-label" htmlFor="room-code">
            Room code
          </label>
          <input
            id="room-code"
            className="text-input"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value)}
            autoComplete="off"
            required
          />

          <label className="field-label" htmlFor="display-name">
            Display name
          </label>
          <input
            id="display-name"
            className="text-input"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="off"
            required
          />

          <label className="field-label" htmlFor="player-code">
            Player code (PIN)
          </label>
          <input
            id="player-code"
            className="text-input"
            value={playerCode}
            onChange={(event) => setPlayerCode(event.target.value)}
            autoComplete="off"
            required
          />

          {error ? <p className="error inline-error">{error}</p> : null}

          <button className="action-btn primary" type="submit" disabled={isDisabled}>
            {loading ? "Joining..." : "Join"}
          </button>
        </form>
      </section>
    </div>
  );
}
