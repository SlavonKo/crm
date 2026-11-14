import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-telegram-qr-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
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
    // Cleanup all blob URLs on component destruction (more reliable than just close)
    this.cleanupBlobUrls();
  }

  private loadQrCode(): void {
    // Fetch QR code from backend API endpoint
    const qrPath = '/api/telegram/qr';
    
    console.log('[QR Dialog] Starting to load QR code from:', qrPath);
    this.isRetrying = false;
    
    this.http.get(qrPath, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        console.log('[QR Dialog] Blob received, size:', blob.size, 'type:', blob.type);
        
        // Create blob URL for displaying the image
        const blobUrl = URL.createObjectURL(blob);
        this.qrBlobUrl = blobUrl;
        this.blobUrlsToClean.add(blobUrl);
        this.qrImageUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
        this.isLoading = false;
        this.error = null;
        
        // Trigger change detection
        this.cdr.markForCheck();
        console.log('[QR Dialog] QR code loaded successfully');
      },
      error: (err: unknown) => {
        console.error('[QR Dialog] Error loading QR code:', err);
        
        // Provide more detailed error messages based on the error type
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
          errorMsg = err.message;
        }
        
        this.error = errorMsg;
        this.isLoading = false;
        
        // Trigger change detection
        this.cdr.markForCheck();
      },
    });
  }

  retryLoadingQr(): void {
    console.log('[QR Dialog] Retrying QR code load');
    this.isRetrying = true;
    this.loadQrCode();
  }

  downloadQr(): void {
    if (!this.qrBlobUrl) {
      console.log('[QR Dialog] QR code not available for download');
      this.error = 'QR code not available for download';
      return;
    }

    // Create download link
    const link = document.createElement('a');
    link.href = this.qrBlobUrl;
    link.download = 'telegram-bot-qr.png';
    link.click();
    console.log('[QR Dialog] Download initiated');
  }

  private cleanupBlobUrls(): void {
    // Clean up all blob URLs to prevent memory leaks
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
