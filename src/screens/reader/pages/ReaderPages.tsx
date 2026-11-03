import type { MangaChapter, ReaderData } from '../../../source/zonatmo';
import type {
  ReaderMode,
  ReaderQuality,
  ReaderScale,
} from '../../../storage/readerSettings';
import { ReaderTransition } from '../components/ReaderTransition';
import { PagedPages } from './PagedPages';
import { VerticalPages } from './VerticalPages';

export function ReaderPages({
  data,
  mode,
  scale,
  quality,
  page,
  width,
  height,
  bottomInset,
  onPageChange,
  onToggleChrome,
  onOpenNext,
}: {
  data: ReaderData;
  mode: ReaderMode;
  scale: ReaderScale;
  quality: ReaderQuality;
  page: number;
  width: number;
  height: number;
  bottomInset: number;
  onPageChange: (page: number) => void;
  onToggleChrome: () => void;
  onOpenNext: (chapter: MangaChapter) => void;
}) {
  const footer = (
    <ReaderTransition
      next={data.next}
      width={width}
      height={height}
      bottomInset={bottomInset}
      chapterIndex={data.chapterIndex}
      onOpenNext={onOpenNext}
      onToggleChrome={onToggleChrome}
    />
  );

  return mode === 'webtoon' ? (
    <VerticalPages
      pages={data.pages}
      width={width}
      windowHeight={height}
      scale={scale}
      quality={quality}
      initialPage={page}
      onPageChange={onPageChange}
      onToggleChrome={onToggleChrome}
      footer={footer}
    />
  ) : (
    <PagedPages
      pages={data.pages}
      width={width}
      windowHeight={height}
      scale={scale}
      quality={quality}
      direction={mode === 'paged-ltr' ? 'ltr' : 'rtl'}
      initialPage={page}
      onPageChange={onPageChange}
      onToggleChrome={onToggleChrome}
      footer={footer}
    />
  );
}
