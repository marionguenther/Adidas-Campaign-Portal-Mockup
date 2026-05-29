import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'wf-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <header class="topbar">
      <div class="brand">
        <svg class="logo" viewBox="0 0 100 60" aria-hidden="true">
          <g fill="currentColor">
            <path d="M 0 55 L 15 55 L 30 25 L 15 25 Z" />
            <path d="M 25 55 L 40 55 L 55 15 L 40 15 Z" />
            <path d="M 50 55 L 65 55 L 80 5 L 65 5 Z" />
          </g>
        </svg>
        <span class="wordmark">adidas</span>
        <span class="divider" aria-hidden="true"></span>
        <span class="title">Campaign Portal</span>
      </div>
      @if (auth.user(); as user) {
        <div class="user">
          <span class="user-name">{{ user.name ?? user.email }}</span>
          <button type="button" (click)="auth.logout()">Logout</button>
        </div>
      } @else {
        <button type="button" (click)="auth.login()">Login</button>
      }
    </header>
    <main><router-outlet /></main>
  `,
  styles: [
    `
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 28px;
        background: #fff;
        border-bottom: 2px solid #000;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
        color: #000;
      }
      .logo {
        height: 30px;
        width: auto;
        display: block;
      }
      .wordmark {
        font-weight: 800;
        font-size: 22px;
        letter-spacing: -0.5px;
        color: #000;
      }
      .divider {
        width: 1px;
        height: 22px;
        background: #d1d5db;
        margin: 0 4px;
      }
      .title {
        font-size: 14px;
        font-weight: 500;
        color: #4b5563;
        letter-spacing: 0.2px;
      }
      .user { display: flex; gap: 14px; align-items: center; }
      .user-name { font-size: 13px; color: #4b5563; }
      button {
        padding: 7px 16px;
        border: 1px solid #000;
        border-radius: 0;
        background: #fff;
        color: #000;
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        transition: background 120ms, color 120ms;
      }
      button:hover { background: #000; color: #fff; }
      main { padding: 24px 28px; background: #fff; min-height: calc(100vh - 60px); }
    `,
  ],
})
export class AppComponent implements OnInit {
  readonly auth = inject(AuthService);
  ngOnInit(): void {
    this.auth.refreshUser();
  }
}
