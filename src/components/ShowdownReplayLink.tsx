export default function ShowdownReplayLink({
  url,
  className = "",
}: {
  url: string | null;
  className?: string;
}) {
  if (!url) return null;

  return (
    <a
      className={`inline-flex rounded-lg border border-sky-300/30 px-3 py-1.5 text-xs font-bold text-sky-100 transition hover:bg-sky-300/10 ${className}`}
      href={url}
      rel="noreferrer"
      target="_blank"
    >
      Ver partida
    </a>
  );
}
