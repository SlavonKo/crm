import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { Subject, timer } from 'rxjs';
import { takeUntil, retry, timeout } from 'rxjs/operators';

@Component({
  selector: 'app-telegram-qr-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  providers: [],
  templateUrl: './telegram-qr-dialog.html',
  styleUrl: './telegram-qr-dialog.scss',
})
export class TelegramQrDialogComponent implements OnInit, OnDestroy {
  qrImageUrl: SafeResourceUrl | null = null;
  isLoading = true;
  error: string | null = null;
  qrBlobUrl: string | null = null;
  isRetrying = false;
  private blobUrlsToClean: Set<string> = new Set();
  private destroy$ = new Subject<void>();
  private maxRetries = 3;
  private retryCount = 0;

  constructor(
    readonly dialogRef: MatDialogRef<TelegramQrDialogComponent>,
    private sanitizer: DomSanitizer,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadQrCode();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupBlobUrls();
  }

  private loadQrCode(): void {
    const qrPath = '/api/telegram/qr';
    
    console.log('[QR Dialog] Starting to load QR code from:', qrPath);
    this.isRetrying = false;
    
    // Add cache-busting query param to bypass browser cache during load attempts
    const params = new HttpParams().set('t', Date.now().toString());
    
    this.http
      .get(qrPath, { responseType: 'blob', params })
      .pipe(
        // Retry up to 3 times with exponential backoff
        retry({
          count: this.maxRetries,
          delay: (error, retryCount) => {
            console.log(`[QR Dialog] Retry ${retryCount} after error:`, error);
            return timer(1000 * (retryCount + 1)); // 1s, 2s, 3s...
          },
        }),
        // Timeout after 10 seconds
        timeout(10000),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (blob: Blob) => {
          console.log('[QR Dialog] Blob received, size:', blob.size, 'type:', blob.type);
          
          const blobUrl = URL.createObjectURL(blob);
          this.qrBlobUrl = blobUrl;
          this.blobUrlsToClean.add(blobUrl);
          this.qrImageUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
          this.isLoading = false;
          this.error = null;
          this.retryCount = 0;
          
          this.cdr.markForCheck();
          console.log('[QR Dialog] QR code loaded successfully');
        },
        error: (err: unknown) => {
          console.error('[QR Dialog] Error loading QR code after retries:', err);
          
          let errorMsg = 'Failed to load QR code';
          
          if (err instanceof HttpErrorResponse) {
            if (err.status === 404) {
              errorMsg = 'QR code not found. Make sure the Telegram bot is initialized.';
            } else if (err.status === 0) {
              errorMsg = 'Cannot connect to the server. Check your connection.';
            } else {
              errorMsg = `Server error (${err.status}). Please try again.`;
            }
          } else if (err instanceof Error) {
            if (err.message.includes('Timeout')) {
              errorMsg = 'Request timed out. Server might be busy.';
            } else {
              errorMsg = err.message;
            }
          }
          
          this.error = errorMsg;
          this.isLoading = false;
          this.retryCount = 0;
          
          this.cdr.markForCheck();
        },
      });
  }

  retryLoadingQr(): void {
    console.log('[QR Dialog] Retrying QR code load');
    this.isRetrying = true;
    this.retryCount = 0;
    this.loadQrCode();
  }

  downloadQr(): void {
    if (!this.qrBlobUrl) {
      console.log('[QR Dialog] QR code not available for download');
      this.error = 'QR code not available for download';
      return;
    }

    const link = document.createElement('a');
    link.href = this.qrBlobUrl;
    link.download = 'telegram-bot-qr.png';
    link.click();
    console.log('[QR Dialog] Download initiated');
  }

  private cleanupBlobUrls(): void {
    this.blobUrlsToClean.forEach(url => {
      URL.revokeObjectURL(url);
      console.log('[QR Dialog] Blob URL cleaned up:', url.substring(0, 30) + '...');
    });
    this.blobUrlsToClean.clear();
    this.qrBlobUrl = null;
  }

  close(): void {
    this.cleanupBlobUrls();
    this.dialogRef.close();
  }
}
