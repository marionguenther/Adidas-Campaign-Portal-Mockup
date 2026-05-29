import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';

export interface AuthUser {
  sub: string;
  email?: string;
  name?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly user = signal<AuthUser | null>(null);

  refreshUser(): void {
    this.http
      .get<{ authenticated: boolean; user?: AuthUser }>('/auth/me', { withCredentials: true })
      .pipe(
        tap((res) => this.user.set(res.user ?? null)),
        catchError(() => {
          this.user.set(null);
          return of(null);
        }),
      )
      .subscribe();
  }

  login(returnTo: string = window.location.pathname): void {
    window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  }

  logout(): void {
    this.http
      .post('/auth/logout', null, { withCredentials: true })
      .subscribe(() => {
        this.user.set(null);
        window.location.href = '/';
      });
  }
}
