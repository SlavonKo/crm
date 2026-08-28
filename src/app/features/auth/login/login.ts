import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

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
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  readonly authService = inject(AuthService);
  readonly #router      = inject(Router);
  readonly #route       = inject(ActivatedRoute);
  readonly #fb          = inject(FormBuilder);

  readonly phoneForm: FormGroup = this.#fb.group({
    phone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]{9,15}$/)]],
  });

  onLogin(): void {
    if (this.phoneForm.invalid) return;

    const success = this.authService.login(this.phoneForm.value.phone);
    if (success) {
      const returnUrl = this.#route.snapshot.queryParamMap.get('returnUrl') ?? '/orders';
      this.#router.navigateByUrl(returnUrl);
    }
  }
}
