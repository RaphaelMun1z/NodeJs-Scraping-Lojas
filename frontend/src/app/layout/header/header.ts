import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProdutosApiService } from '../../features/produtos/data-access/produtos-api.service';
import { AuthApiService } from '../../core/auth/auth-api.service';
@Component({
  selector: 'app-header',
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<header class="topbar">
    <a routerLink="/produtos" class="brand">Live Promo</a>
    <div class="global-search">
      <form (submit)="search($event)">
        <input
          [formControl]="query"
          placeholder="iPhone 17 Pro Max..."
          aria-label="Buscar produtos"
          autocomplete="off"
        /><button type="submit">Buscar <i data-lucide="search" aria-hidden="true"></i></button>
      </form>
      @if (suggestions().length) {
        <div class="suggestions">
          @for (suggestion of suggestions(); track suggestion) {
            <button type="button" (click)="choose(suggestion)">{{ suggestion }}</button>
          }
        </div>
      }
    </div>
    <div class="account">
      @if (auth.authenticated()) {
        <button class="account-avatar is-authenticated" type="button" (click)="logout()">{{ (auth.administrator()?.email ?? 'A').slice(0, 1).toUpperCase() }}</button>
      } @else {
        <a routerLink="/admin/login" class="account-avatar account-login-button">Entrar</a>
      }
    </div>
  </header>`,
  styles: `
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .topbar {
      height: 64px;
      display: flex;
      align-items: center;
      gap: 28px;
      padding: 0 30px;
      border-bottom: 1px solid var(--line);
      background: #fff;
    }
    .brand {
      color: #111;
      font-size: 25px;
      font-weight: 700;
      letter-spacing: -1.5px;
      white-space: nowrap;
    }
    .global-search {
      position: relative;
      display: flex;
      align-items: center;
      width: min(450px, 48vw);
      height: 36px;
      margin: 0 auto;
      overflow: visible;
      border: 1px solid #dcdcdc;
      border-radius: 20px;
      background: #fff;
    }
    form {
      display: flex;
      width: 100%;
      align-items: center;
    }
    input {
      min-width: 0;
      flex: 1;
      height: 100%;
      padding: 0 10px;
      border: 0;
      outline: 0;
      background: transparent;
      color: #333;
    }
    form button {
      display: inline-flex;
      align-items: center;
      height: 28px;
      margin-right: 4px;
      padding: 0 23px;
      border: 0;
      border-radius: 16px;
      background: var(--blue);
      color: #fff;
      font-size: 12px;
      font-weight: 500;
      gap: 8px;
    }
    form button:hover { background: var(--blue-dark); }
    form button .lucide { display: inline-block; width: 16px; height: 16px; }
    .suggestions {
      position: absolute;
      z-index: 30;
      top: 42px;
      right: 0;
      left: 0;
      display: grid;
      border: 1px solid var(--line);
      max-height: 320px;
      overflow-x: hidden;
      overflow-y: auto;
      border-radius: 9px;
      background: #fff;
    }
    .suggestions button {
      min-height: 38px;
      padding: 8px 12px;
      border: 0;
      background: #fff;
      color: #333;
      text-align: left;
      font-size: 12px;
      line-height: 1.35;
    }
    .account-avatar {
      display: grid;
      width: 34px;
      height: 34px;
      place-items: center;
      border: 1px solid #c8d5ff;
      border-radius: 50%;
      background: #f1f3f7;
      color: #687083;
      font-size: 13px;
      font-weight: 700;
    }
    .account { position: relative; margin-left: auto; }
    .account-avatar.is-authenticated { border-color: #c8d5ff; background: #e8edff; color: var(--blue); }
    .account-login-button { width: auto; padding: 0 14px; border-color: var(--blue); border-radius: 17px; background: var(--blue); color: #fff; }
    @media (max-width: 760px) {
      .topbar {
        gap: 12px;
        padding: 0 16px;
      }
      .global-search {
        width: auto;
        flex: 1;
      }
      .brand {
        font-size: 21px;
      }
      .account-avatar {
        width: 36px;
        height: 36px;
      }
    }
  `,
})
export class HeaderComponent {
  protected readonly auth = inject(AuthApiService);
  protected readonly query = new FormControl('', { nonNullable: true });
  protected readonly suggestions = signal<string[]>([]);
  private readonly products = inject(ProdutosApiService);
  private readonly router = inject(Router);
  constructor() {
    const destroyRef = inject(DestroyRef);
    this.query.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        filter((value) => value.trim().length >= 2),
        switchMap((value) => this.products.suggestions(value.trim())),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((items) => this.suggestions.set(items));
  }
  protected search(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/produtos'], {
      queryParams: { busca: this.query.value.trim() || null },
    });
    this.suggestions.set([]);
  }
  protected choose(value: string): void {
    this.query.setValue(value);
    this.search(new Event('submit'));
  }
  protected logout(): void {
    this.auth.logout().subscribe(() => void this.router.navigate(['/produtos']));
  }
}
