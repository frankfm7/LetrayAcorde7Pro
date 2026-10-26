import { Fragment } from 'react';
import { highlightSegments } from '../utils/search';

/** Muestra un texto resaltando lo buscado (ignora tildes y mayúsculas). */
export default function Highlight({ text, query }: { text: string; query: string }) {
  const segments = highlightSegments(text, query);
  return (
    <>
      {segments.map((seg, i) =>
        seg.hit ? (
          <mark key={i} className="search-mark">{seg.text}</mark>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        )
      )}
    </>
  );
}
