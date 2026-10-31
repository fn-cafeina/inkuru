import type { MangaChapter, ReaderData } from '../../../source/leercapitulo';
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
  title,
  onPageChange,
  onToggleChrome,
  onOpenNext,
  onOpenPrev,
  onOpenPicker,
}: {
  data: ReaderData;
  mode: ReaderMode;
  scale: ReaderScale;
  quality: ReaderQuality;
  page: number;
  width: number;
  height: number;
  bottomInset: number;
  title: string;
  onPageChange: (page: number) => void;
  onToggleChrome: () => void;
  onOpenNext: (chapter: MangaChapter) => void;
  onOpenPrev: (chapter: MangaChapter) => void;
  onOpenPicker: () => void;
}) {
  const footer = (
    <ReaderTransition
      currentTitle={data.title || title}
      next={data.next}
      prev={data.prev}
      width={width}
      height={height}
      bottomInset={bottomInset}
      onOpenNext={onOpenNext}
      onOpenPrev={onOpenPrev}
      onOpenPicker={onOpenPicker}
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
