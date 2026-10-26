import { useSongLibrary } from '../hooks/useSongLibrary';
import { useBackgrounds, useViewBackground, resolveBackgroundUrl } from '../utils/backgroundStore';

/** Capa de imagen detrás de toda la app. Se aclara con una capa del color del tema para que el texto se lea bien. */
export default function BackgroundLayer() {
  const settings = useBackgrounds();
  const view = useViewBackground();
  const { hymnals } = useSongLibrary();
  const hymnal = view.hymnalId ? hymnals.find(h => h.id === view.hymnalId) : undefined;
  const url = resolveBackgroundUrl(view, settings, hymnal);
  if (!url) return null;

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage: `url("${url}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: settings.blur > 0 ? `blur(${settings.blur}px)` : undefined,
          transform: settings.blur > 0 ? 'scale(1.06)' : undefined,
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0, backgroundColor: `color-mix(in srgb, var(--bg-primary) ${settings.overlay}%, transparent)` }}
      />
    </>
  );
}
