import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <nav class="pagination" aria-label="Paginação">
        @for (item of pages(); track item) {
          <button class="page-button" [class.is-current]="item === page()" type="button" (click)="changed.emit(item)">{{ item }}</button>
        }
        <button
          type="button"
          class="page-button previous-page-button"
          [disabled]="page() === 1"
          (click)="changed.emit(page() - 1)"
        >
          ← Anterior
        </button>
        <span>Página {{ page() }} de {{ totalPages() }}</span>
        <button
          type="button"
          class="page-button next-page-button"
          [disabled]="page() === totalPages()"
          (click)="changed.emit(page() + 1)"
        >
          Próxima →
        </button>
      </nav>
    }
  `,
  styles: `
    .pagination { display: flex; justify-content: center; gap: 6px; margin-top: 30px; }
    .page-button { min-width: 32px; height: 32px; border: 1px solid #ddd; border-radius: 6px; background: #fff; color: #555; font-size: 12px; }
    .page-button.is-current { border-color: var(--blue); background: var(--blue); color: #fff; }
    .page-button:disabled { cursor: not-allowed; opacity: .35; }
    .previous-page-button { order: -1; }
    .pagination > span { display: none; }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly changed = output<number>();
  protected readonly label = computed(() => `${this.page()} / ${this.totalPages()}`);
  protected readonly pages = computed(() => {
    const start = Math.max(1, this.page() - 2);
    const end = Math.min(this.totalPages(), start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });
}
