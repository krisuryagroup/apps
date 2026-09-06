import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { I18nPipe } from '@zitro/i18n';
import {
  ZOOMABLE_IMAGE_DEFAULT_CONFIG,
  ZoomableImageComponent,
} from '../zoomable-image/zoomable-image.component';

/**
 * A KYC/verification-document field: a small thumbnail if something's uploaded
 * (so "is this actually uploaded?" is answerable at a glance, instead of a plain
 * text link that looks identical whether the file exists or not), a clearly
 * distinct empty state if nothing's uploaded yet, and — on clicking the thumbnail —
 * a same-window modal viewer with zoom in/out controls (reusing ZoomableImageComponent
 * for images) plus an explicit "open in a new window" escape hatch for anyone who
 * wants the file in its own tab (full-resolution download, printing, etc.).
 *
 * PDFs can't be zoomed the same way as an image — they render in an <iframe> and
 * rely on the browser's own built-in PDF viewer (which has its own zoom controls).
 */
@Component({
  selector: 'lib-document-viewer',
  standalone: true,
  imports: [I18nPipe, ZoomableImageComponent],
  templateUrl: './document-viewer.component.html',
  styleUrl: './document-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentViewerComponent {
  private readonly sanitizer = inject(DomSanitizer);

  url = input<string | null | undefined>(null);
  label = input('Document');

  protected isOpen = signal(false);

  protected isPdf = computed(() =>
    (this.url() ?? '').toLowerCase().split('?')[0].endsWith('.pdf'),
  );

  protected safeUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.url() ?? ''),
  );

  protected readonly zoomConfig = {
    ...ZOOMABLE_IMAGE_DEFAULT_CONFIG,
    width: '100%',
    height: '70vh',
    objectFit: 'contain' as const,
  };

  protected open(): void {
    if (this.url()) this.isOpen.set(true);
  }

  protected close(): void {
    this.isOpen.set(false);
  }
}
