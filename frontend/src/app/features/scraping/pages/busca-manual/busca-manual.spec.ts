import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FontesApiService } from '../../../fontes/data-access/fontes-api.service';
import { ScrapingApiService } from '../../data-access/scraping-api.service';
import { BuscaManualPage } from './busca-manual';

describe('BuscaManualPage', () => {
  let fixture: ComponentFixture<BuscaManualPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuscaManualPage],
      providers: [
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
      element.querySelectorAll<HTMLInputElement>('.source-options input[type="checkbox"]'),
    );

    for (const checkbox of checkboxes) {
      checkbox.click();
      fixture.detectChanges();
    }

    const searchButton = element.querySelector<HTMLButtonElement>('.controls .btn.primary');
    expect(searchButton?.disabled).toBe(true);
  });
});
