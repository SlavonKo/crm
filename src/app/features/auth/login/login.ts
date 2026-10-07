import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { TotpService } from '../../../core/auth/totp.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslocoModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  readonly authService = inject(AuthService);
  readonly #totp       = inject(TotpService);
  readonly #router     = inject(Router);
  readonly #route      = inject(ActivatedRoute);
  readonly #fb         = inject(FormBuilder);

  // ─── Forms ─────────────────────────────────────────────────────────────────

  readonly credentialsForm: FormGroup = this.#fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly totpForm: FormGroup = this.#fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  // ─── UI state ──────────────────────────────────────────────────────────────

  readonly isLoading     = signal(false);
  readonly showPassword  = signal(false);
  readonly qrCodeUrl     = signal<string | null>(null);

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // If already authenticated — go directly to orders
    if (this.authService.isAuthenticated()) {
      const returnUrl = this.#route.snapshot.queryParamMap.get('returnUrl') ?? '/orders';
      this.#router.navigateByUrl(returnUrl);
      return;
    }

    // Pre-fill email from the remembered-email cookie
    const remembered = this.authService.getRememberedEmail();
    if (remembered) {
      this.credentialsForm.patchValue({ email: remembered });
    }
  }

  // ─── Step 1: email + password ──────────────────────────────────────────────

  async onSubmitCredentials(): Promise<void> {
    if (this.credentialsForm.invalid) return;
    this.isLoading.set(true);

    const { email, password } = this.credentialsForm.value;
    const nextStep = await this.authService.validateCredentials(email, password);

    if (nextStep === 'setup-totp') {
      // First login — render the QR-code
      const secret = this.authService.pendingTotpSecret()!;
      this.qrCodeUrl.set(await this.#totp.getQrCodeDataUrl(secret, email));
    }

    if (nextStep === 'authenticated') {
      this.#navigateAfterLogin();
    }

    this.isLoading.set(false);
  }

  // ─── Step 2: TOTP verification (both regular and first-time setup) ──────────

  async onSubmitTotp(): Promise<void> {
    if (this.totpForm.invalid) return;
    this.isLoading.set(true);

    const { code } = this.totpForm.value;
    const step = this.authService.authStep();

    let success: boolean;
    if (step === 'setup-totp') {
      success = await this.authService.confirmTotpSetup(code);
    } else {
      success = await this.authService.verifyTotp(code);
    }

    if (success) {
      this.#navigateAfterLogin();
    } else {
      this.totpForm.reset();
    }

    this.isLoading.set(false);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  goBackToCredentials(): void {
    this.authService.authStep.set('credentials');
    this.totpForm.reset();
    this.qrCodeUrl.set(null);
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  #navigateAfterLogin(): void {
    const returnUrl = this.#route.snapshot.queryParamMap.get('returnUrl') ?? '/orders';
    this.#router.navigateByUrl(returnUrl);
  }
}
