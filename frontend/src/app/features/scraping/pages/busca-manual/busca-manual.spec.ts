import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FontesApiService } from '../../../fontes/data-access/fontes-api.service';
import { ScrapingApiService } from '../../data-access/scraping-api.service';
import { BuscaManualPage } from './busca-manual';
import { APP_ICON_PROVIDERS } from '../../../../app-icons';

describe('BuscaManualPage', () => {
  let fixture: ComponentFixture<BuscaManualPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuscaManualPage],
      providers: [
        ...APP_ICON_PROVIDERS,
        {
          provide: FontesApiService,
          useValue: {
            config: () =>
              of({
                fontes: [
                  { fonte: 'loja-a', nome: 'Loja A', ativa: true, categorias: [] },
                  { fonte: 'loja-b', nome: 'Loja B', ativa: true, categorias: [] },
                ],
              }),
          },
        },
        {
          provide: ScrapingApiService,
          useValue: { manualSearch: () => of({ itens: [], erros: [] }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BuscaManualPage);
    fixture.detectChanges();
  });

  it('impede uma busca sem fontes selecionadas', () => {
    const element = fixture.nativeElement as HTMLElement;
    const checkboxes = Array.from(
      element.querySelectorAll<HTMLInputElement>(
        '.manual-search-store-filters input[type="checkbox"]',
      ),
    );

    for (const checkbox of checkboxes) {
      checkbox.click();
      fixture.detectChanges();
    }

    const searchButton = element.querySelector<HTMLButtonElement>(
      '.manual-search-execute-button button',
    );
    expect(searchButton?.disabled).toBe(true);
  });
});
