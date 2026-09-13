import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfiguredSource, ScrapingConfig, SourceCategory } from '../../../../core/models/domain.models';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { FontesApiService } from '../../data-access/fontes-api.service';
import { SourceIdentityComponent } from '../../../../shared/components/source-identity/source-identity';
import { PopupService } from '../../../../core/services/popup.service';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-fontes-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    SourceIdentityComponent,
    UiButtonComponent,
    LucideDynamicIcon,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-heading">
      <div>
        <h1>Fontes</h1>
      </div>
    </header>
    @if (feedback()) {
      <div class="feedback" [class.error]="failed()">{{ feedback() }}</div>
    }
    @if (loading()) {
      <div class="panel state">Carregando fontes…</div>
    } @else if (!config()?.fontes?.length) {
      @if (showForm()) {
        <div class="source-grid creation-grid">
          <ng-container [ngTemplateOutlet]="createForm" />
        </div>
      } @else {
        <div class="panel onboarding">
          <svg class="onboarding-icon" lucideIcon="store" aria-hidden="true"></svg>
          <h2>Cadastre sua primeira fonte</h2>
          <p>
            Depois você poderá adicionar notebooks, processadores, placas de vídeo e qualquer outra
            categoria de forma independente.
          </p>
          <app-ui-button
            class="onboarding-action"
            label="Adicionar fonte"
            icon="plus"
            (click)="showForm.set(true)"
          />
        </div>
      }
    } @else {
      <div class="source-grid" [class.creation-grid]="showForm() && !config()?.fontes?.length">
        @if (!showForm()) {
          <app-ui-button
            class="add-source-button"
            icon="plus"
            [iconOnly]="true"
            ariaLabel="Adicionar fonte"
            title="Adicionar fonte"
            variant="primary"
            (click)="showForm.set(true)"
          />
        }
        @if (showForm()) {
          <ng-container [ngTemplateOutlet]="createForm" />
        }
        @for (source of config()?.fontes; track source.fonte) {
          <article class="source-card">
            <div class="source-main">
              <label
                class="switch"
                [class.is-active]="source.ativa"
                [class.is-inactive]="!source.ativa"
                [attr.aria-label]="'Alterar status da coleta de ' + source.nome"
              >
                <input type="checkbox" [checked]="source.ativa" (change)="toggle(source, $event)" />
                <span class="switch-track"><span></span></span>
                <span class="switch-status">{{ source.ativa ? 'Ativo' : 'Inativo' }}</span>
              </label>
              <app-source-identity [name]="source.nome" [logo]="source.logo ?? ''" [large]="true" />
            </div>
            <app-ui-button
              class="source-count add-category-inline"
              icon="plus"
              [iconOnly]="true"
              ariaLabel="Adicionar categoria"
              title="Adicionar categoria"
              variant="primary"
              (click)="startCategory(source.fonte)"
            />
            <div class="source-actions">
              <app-ui-button
                class="source-action configure"
                [routerLink]="['/admin/fontes', source.fonte]"
                aria-label="Configurar fonte"
                icon="pencil"
                [iconOnly]="true"
                ariaLabel="Configurar fonte"
                variant="secondary"
              />
              <app-ui-button
                class="source-action remove"
                icon="trash-2"
                [iconOnly]="true"
                ariaLabel="Excluir fonte"
                variant="danger"
                (click)="remove(source)"
              />
            </div>
            @if (source.categorias.length) {
              <div class="category-list" aria-label="Categorias da fonte">
                @for (category of source.categorias; track category.id) {
                  @if (editingCategoryId() === category.id && categorySource() === source.fonte) {
                    <form class="inline-category-form category-edit-form" [formGroup]="categoryForm" (ngSubmit)="saveCategory(source)">
                      <div class="category-icon-control">
                        <app-ui-button
                          [icon]="categoryForm.controls.icone.value"
                          [iconOnly]="true"
                          height="32px"
                          iconSize="32px"
                          ariaLabel="Escolher ícone da categoria"
                          title="Escolher ícone"
                          variant="secondary"
                          type="button"
                          (click)="toggleIconPicker()"
                        />
                        @if (iconPickerOpen()) {
                          <div class="category-icon-picker" role="dialog" aria-label="Escolher ícone">
                            <input
                              class="icon-search"
                              type="search"
                              placeholder="Buscar ícone"
                              aria-label="Buscar ícone pelo nome"
                              [value]="iconSearch()"
                              (input)="setIconSearch($event)"
                            />
                            <div class="category-icon-options">
                              @for (item of filteredCategoryIcons(); track item.name) {
                                <app-ui-button
                                  [icon]="item.name"
                                  [iconOnly]="true"
                                  height="32px"
                                  iconSize="32px"
                                  [ariaLabel]="item.label"
                                  [attr.title]="item.label"
                                  variant="secondary"
                                  type="button"
                                  (click)="selectCategoryIcon(item.name)"
                                />
                              }
                            </div>
                          </div>
                        }
                      </div>
                      <input formControlName="categoria" placeholder="Nome da categoria" />
                      <input formControlName="url" type="url" placeholder="https://loja.com/categoria" />
                      <app-ui-button
                        icon="x"
                        [iconOnly]="true"
                        height="32px"
                        iconSize="32px"
                        ariaLabel="Cancelar edição da categoria"
                        title="Cancelar"
                        variant="secondary"
                        type="button"
                        (click)="cancelCategory()"
                      />
                      <app-ui-button
                        icon="save"
                        [iconOnly]="true"
                        height="32px"
                        iconSize="32px"
                        ariaLabel="Salvar categoria"
                        title="Salvar categoria"
                        variant="primary"
                        type="submit"
                        [disabled]="categorySaving()"
                      />
                    </form>
                  } @else {
                  <div class="category-row">
                    <label
                      class="category-switch"
                      [class.is-active]="category.ativa"
                      [class.is-inactive]="!category.ativa"
                      [attr.aria-label]="'Alterar status da categoria ' + category.categoria"
                    >
                      <input
                        type="checkbox"
                        [checked]="category.ativa"
                        (change)="toggleCategory(source, category, $event)"
                      />
                      <span class="category-switch-track"><span></span></span>
                    </label>
                    <div class="category-name">
                      <svg [lucideIcon]="category.icone || 'tag'" aria-hidden="true"></svg>
                      <span>{{ category.categoria || 'Categoria sem nome' }}</span>
                    </div>
                    <app-ui-button
                      class="category-action"
                      icon="pencil"
                      [iconOnly]="true"
                      height="32px"
                      iconSize="32px"
                      ariaLabel="Editar categoria"
                      title="Editar categoria"
                      variant="secondary"
                      (click)="startEditCategory(source, category)"
                    />
                    <app-ui-button
                      class="category-action category-delete"
                      icon="trash-2"
                      [iconOnly]="true"
                      height="32px"
                      iconSize="32px"
                      ariaLabel="Excluir categoria"
                      title="Excluir categoria"
                      variant="danger"
                      (click)="removeCategory(source, category)"
                    />
                  </div>
                  }
                }
              </div>
            }
            @if (categorySource() === source.fonte && !editingCategoryId()) {
              <form class="inline-category-form" [formGroup]="categoryForm" (ngSubmit)="saveCategory(source)">
                <input formControlName="categoria" placeholder="Nome da categoria" />
                <select formControlName="icone" aria-label="Ícone da categoria">
                  @for (item of categoryIcons; track item.name) {
                    <option [value]="item.name">{{ item.label }}</option>
                  }
                </select>
                <input formControlName="url" type="url" placeholder="https://loja.com/categoria" />
                <app-ui-button
                  icon="x"
                  [iconOnly]="true"
                  height="32px"
                  iconSize="32px"
                  ariaLabel="Cancelar categoria"
                  title="Cancelar"
                  variant="secondary"
                  type="button"
                  (click)="cancelCategory()"
                />
                <app-ui-button
                  icon="save"
                  [iconOnly]="true"
                  height="32px"
                  iconSize="32px"
                  ariaLabel="Salvar categoria"
                  title="Salvar categoria"
                  variant="primary"
                  type="submit"
                  [disabled]="categorySaving()"
                />
              </form>
            }
          </article>
        }
      </div>
    }
    <ng-template #createForm>
        <form class="source-card add-form create-source-card" [formGroup]="form" (ngSubmit)="add()">
          <div class="source-form-row">
          <div class="source-form-main">
            <input
              #logoInput
              class="visually-hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              (change)="selectLogo($event)"
            />
            <app-ui-button
              class="logo-upload"
              [icon]="logo() ? '' : 'upload'"
              [imageUrl]="logo()"
              [iconOnly]="true"
              [ariaLabel]="logo() ? 'Alterar logo' : 'Adicionar logo'"
              [attr.title]="logoFileName() || 'Selecionar ou trocar logo'"
              variant="secondary"
              (click)="logoInput.click()"
            />
            <label class="name-field">
              <span class="visually-hidden">Nome da fonte <em class="required-marker">*</em></span>
              <input formControlName="nome" placeholder="Ex.: KaBuM!" autocomplete="organization" />
              @if (fieldError('nome')) {
                <small class="field-error">{{ fieldError('nome') }}</small>
              }
            </label>
          </div>
          <div class="actions">
            <app-ui-button
              class="form-cancel"
              icon="x"
              [iconOnly]="true"
              ariaLabel="Cancelar criação da fonte"
              title="Cancelar"
              variant="secondary"
              (click)="cancelForm()"
            />
            <app-ui-button
              class="form-save"
              icon="save"
              [iconOnly]="true"
              ariaLabel="Salvar fonte"
              title="Salvar fonte"
              type="submit"
              variant="primary"
              [disabled]="saving()"
            />
          </div>
          </div>
          <div class="source-category-form" formArrayName="categorias">
            <div class="source-category-heading">
              <span>Categorias da fonte</span>
              <app-ui-button
                label="Adicionar categoria"
                icon="plus"
                height="32px"
                variant="primary"
                type="button"
                (click)="addCategory()"
              />
            </div>
            @for (category of categories.controls; track category.controls.id.value; let index = $index) {
              <div class="source-category-row" [formGroupName]="index">
                <input formControlName="id" type="hidden" />
                <select formControlName="icone" aria-label="Ícone da categoria">
                  @for (item of categoryIcons; track item.name) {
                    <option [value]="item.name">{{ item.label }}</option>
                  }
                </select>
                <input formControlName="categoria" placeholder="Nome da categoria" />
                <input formControlName="url" type="url" placeholder="https://loja.com/categoria" />
                <app-ui-button
                  icon="x"
                  [iconOnly]="true"
                  height="32px"
                  iconSize="32px"
                  [ariaLabel]="'Remover categoria ' + (index + 1)"
                  title="Remover categoria"
                  variant="secondary"
                  type="button"
                  (click)="removeCategoryDraft(index)"
                />
              </div>
            }
          </div>
      </form>
    </ng-template>
  `,
  styles: `
    .page-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .page-heading h1 {
      margin: 0;
      color: #111827;
      font-size: 22px;
      line-height: 1.2;
      letter-spacing: -0.5px;
    }
    .page-heading > .btn {
      display: none;
    }
    .onboarding p {
      color: var(--muted);
    }
    .add-form {
      grid-template-columns: minmax(0, 1fr) auto;
      min-height: 88px;
      padding: 22px 0;
      animation: form-enter 160ms ease-out;
    }
    .source-form-main {
      display: flex;
      grid-column: 1;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .name-field {
      display: grid;
      flex: 1 1 auto;
      align-items: center;
      align-content: center;
      min-width: 0;
      gap: 0;
      color: #444;
      font-size: 12px;
      font-weight: 600;
    }
    .name-field input {
      width: min(100%, 420px);
      min-height: 38px;
      box-sizing: border-box;
      padding: 0 11px;
      border: 1px solid #d6d6d6;
      border-radius: 6px;
      background: #fff;
      color: #222;
      font: inherit;
      font-weight: 400;
    }
    .name-field input:focus {
      border-color: var(--blue);
      outline: 3px solid rgb(36 86 223 / 14%);
    }
    .name-field > span:first-child {
      text-align: left;
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 0 0 auto;
      margin-left: auto;
    }
    .source-category-form {
      display: grid;
      gap: 8px;
      width: 100%;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #edf0f5;
    }
    .source-category-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #596273;
      font-size: 12px;
      font-weight: 700;
    }
    .source-category-row {
      display: grid;
      grid-template-columns: 40px minmax(150px, 0.7fr) minmax(220px, 1.3fr) 40px;
      align-items: center;
      gap: 8px;
    }
    .source-category-row input {
      width: 100%;
      min-height: 38px;
      box-sizing: border-box;
      padding: 0 11px;
      border: 1px solid #d6d6d6;
      border-radius: 6px;
      background: #fff;
      color: #222;
      font: inherit;
      font-size: 12px;
    }
    .field-error {
      color: #a33;
      font-size: 11px;
    }
    .required-marker {
      color: #a33;
      font-style: normal;
    }
    input.ng-invalid.ng-touched {
      border-color: #a33;
      outline-color: #a33;
    }
    .source-grid {
      display: grid;
      grid-template-columns: 1fr;
      padding: 0 22px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
    }
    :host-context(.admin-layout) .source-grid {
      grid-template-columns: 1fr;
      gap: 0;
    }
    .source-card {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto 40px 40px;
      min-height: 64px;
      align-items: center;
      gap: 10px;
      padding: 12px 0;
      border-bottom: 1px solid #dfe3e8;
    }
    :host-context(.admin-layout) .source-card {
      min-height: 64px;
      padding: 14px 0;
      border-radius: 0;
    }
    .source-card.create-source-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: stretch;
      width: 100%;
    }
    .source-form-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 18px;
    }
    :host-context(.admin-layout) .source-grid.creation-grid .create-source-card {
      border-bottom: 0;
      margin-bottom: 0;
    }
    .source-card:last-child {
      border-bottom: 0;
    }
    .add-source-button {
      grid-column: 1 / -1;
      justify-self: start;
      margin: 18px 0 10px;
    }
    :host-context(.admin-layout) .feedback {
      display: inline-flex;
      width: auto;
      margin: 0 0 12px;
      padding: 7px 10px;
      border-radius: 6px;
      font-size: 11px;
    }
    .source-main {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .source-count {
      padding-top: 0;
      color: #697386;
      font-size: 12px;
    }
    .source-actions {
      display: contents;
    }
    .switch {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 12px;
      white-space: nowrap;
    }
    .switch.is-active {
      color: #168253;
    }
    .switch.is-inactive {
      color: #c44343;
    }
    .switch input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .switch-track {
      display: inline-flex;
      width: 47px;
      height: 28px;
      align-items: center;
      padding: 3px;
      border-radius: 20px;
      background: #e7b4b4;
      transition: background 0.18s ease;
    }
    .switch-track span {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.18s ease;
    }
    .switch.is-active .switch-track {
      background: #22a06b;
    }
    .switch.is-inactive .switch-track {
      background: #d95454;
    }
    .switch input:checked + .switch-track span {
      transform: translateX(19px);
    }
    .source-action {
      position: static;
    }
    .source-action.configure {
      grid-column: 3;
    }
    .source-action.remove {
      grid-column: 4;
    }
    .source-card app-source-identity {
      display: inline-flex;
      align-items: center;
    }
    .source-card .badge {
      display: none;
    }
    .source-card > p {
      display: none;
    }
    .category-list {
      grid-column: 1 / -1;
      display: grid;
      gap: 8px;
      margin: 6px 0 0 21px;
      padding: 4px 0 4px 18px;
      border-left: 1px solid #d5ddeb;
      background: transparent;
    }
    .category-row {
      display: grid;
      grid-template-columns: 47px minmax(0, 1fr) 40px 40px;
      align-items: center;
      gap: 6px;
      min-height: 32px;
      padding: 0 0 0 10px;
      border-radius: 6px;
      color: #596273;
      font-size: 12px;
    }
    .category-row:hover {
      background: transparent;
    }
    .category-name {
      display: flex;
      align-items: center;
      gap: 9px;
      min-width: 0;
    }
    .category-name .lucide {
      width: 16px;
      height: 16px;
      color: #7b8aa5;
    }
    .category-action {
      display: inline-block;
      justify-self: end;
      opacity: 0;
      pointer-events: none;
      transition: opacity 120ms ease;
    }
    .category-row:hover .category-action,
    .category-row:focus-within .category-action {
      opacity: 1;
      pointer-events: auto;
    }
    .category-switch {
      display: inline-flex;
      align-items: center;
      width: 47px;
      height: 28px;
      cursor: pointer;
    }
    .category-switch input {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
    }
    .category-switch-track {
      display: inline-flex;
      width: 47px;
      height: 28px;
      align-items: center;
      padding: 3px;
      border-radius: 20px;
      background: #d95454;
      transition: background 0.18s ease;
    }
    .category-switch-track span {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.18s ease;
    }
    .category-switch.is-active .category-switch-track {
      background: #22a06b;
    }
    .category-switch input:checked + .category-switch-track span {
      transform: translateX(19px);
    }
    .add-category-inline {
      grid-column: 2;
      justify-self: end;
    }
    .inline-category-form {
      display: grid;
      grid-template-columns: 40px minmax(150px, 0.7fr) minmax(220px, 1.3fr) 40px 40px;
      align-items: center;
      gap: 8px;
      margin: 8px 0 2px 38px;
      padding: 10px 12px;
      border: 1px solid #e1e6ef;
      border-radius: 8px;
      background: #fbfcff;
    }
    .inline-category-form.category-edit-form {
      background: transparent;
    }
    .inline-category-form input {
      width: 100%;
      min-height: 38px;
      box-sizing: border-box;
      padding: 0 11px;
      border: 1px solid #d6d6d6;
      border-radius: 6px;
      background: #fff;
      color: #222;
      font: inherit;
      font-size: 12px;
    }
    .category-icon-picker {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      display: grid;
      width: min(360px, 90vw);
      max-height: 280px;
      gap: 6px;
      overflow-y: auto;
      padding: 8px;
      border: 1px solid #dfe3e8;
      border-radius: 8px;
      background: #fff;
    }
    .category-icon-control {
      position: relative;
      z-index: 2;
    }
    .icon-search {
      width: 100%;
      min-height: 34px;
      padding: 0 8px;
      border: 1px solid #d6d6d6;
      border-radius: 6px;
      background: #fff;
    }
    .category-icon-options {
      display: grid;
      grid-template-columns: repeat(6, 32px);
      gap: 6px;
    }
    .onboarding {
      text-align: center;
      padding: 4rem max(1rem, 15%);
    }
    .onboarding-icon {
      display: block;
      width: 48px;
      height: 48px;
      margin: 0 auto 18px;
      color: var(--blue);
      stroke-width: 1.75;
    }
    .onboarding-action {
      display: inline-block;
      margin-top: 8px;
    }
    @keyframes form-enter {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @media (max-width: 850px) {
      .source-grid {
        grid-template-columns: 1fr;
        padding: 0 16px;
      }
      .source-actions {
        display: contents;
      }
      .source-card:not(.create-source-card) {
        grid-template-columns: minmax(0, 1fr) 40px 40px 40px;
      }
      .source-card:not(.create-source-card) .source-main,
      .source-card:not(.create-source-card) .source-count {
        grid-column: 1 / -1;
      }
      .source-card:not(.create-source-card) .source-count {
        grid-column: 2;
        margin-top: 0;
      }
      .page-heading {
        align-items: flex-start;
        gap: 1rem;
      }
      .name-field input {
        width: 100%;
      }
      .actions {
        gap: 6px;
      }
    }
    @media (max-width: 600px) {
      :host-context(.admin-layout) .source-grid.creation-grid {
        padding: 0 16px;
      }
      .add-form {
        display: flex;
        flex-wrap: wrap;
        row-gap: 10px;
      }
      .source-form-main,
      .add-form .actions {
        grid-column: 1;
      }
      .add-form .actions {
        justify-self: end;
      }
      .source-form-row {
        flex-wrap: wrap;
      }
      .source-form-row .source-form-main {
        flex: 1 1 100%;
      }
      .source-form-row .actions {
        margin-left: auto;
      }
      .source-category-row {
        grid-template-columns: minmax(0, 1fr) 40px;
      }
      .source-category-row input:nth-of-type(2) {
        grid-column: 1 / -1;
      }
      .source-category-row app-ui-button {
        grid-column: 2;
        grid-row: 4;
      }
      .source-category-row select,
      .source-category-row input[type='url'] {
        grid-column: 1 / -1;
      }
      .inline-category-form {
        grid-template-columns: minmax(0, 1fr) 40px 40px;
        margin-left: 0;
      }
      .inline-category-form input:first-of-type {
        grid-column: 1 / -1;
      }
      .inline-category-form select,
      .inline-category-form input[type='url'] {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class FontesListPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(FontesApiService);
  private readonly errors = inject(ApiErrorService);
  private readonly popup = inject(PopupService);
  protected readonly config = signal<ScrapingConfig | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly categorySource = signal<string | null>(null);
  protected readonly editingCategoryId = signal<string | null>(null);
  protected readonly iconPickerOpen = signal(false);
  protected readonly iconSearch = signal('');
  protected readonly categorySaving = signal(false);
  protected readonly categoryIcons = [
    { name: 'activity', label: 'Atividade' },
    { name: 'check', label: 'Concluído' },
    { name: 'clock-3', label: 'Relógio' },
    { name: 'download', label: 'Download' },
    { name: 'external-link', label: 'Link externo' },
    { name: 'filter', label: 'Filtro' },
    { name: 'eye', label: 'Visualização' },
    { name: 'info', label: 'Informação' },
    { name: 'mail', label: 'E-mail' },
    { name: 'printer', label: 'Impressão' },
    { name: 'search', label: 'Busca' },
    { name: 'settings', label: 'Configurações' },
    { name: 'shield-check', label: 'Segurança' },
    { name: 'sparkles', label: 'Destaque' },
    { name: 'tag', label: 'Etiqueta' },
    { name: 'timer', label: 'Tempo' },
    { name: 'upload', label: 'Upload' },
    { name: 'x', label: 'Fechar' },
    { name: 'package', label: 'Produto' },
    { name: 'monitor', label: 'Monitor' },
    { name: 'list', label: 'Lista' },
    { name: 'globe-2', label: 'Web' },
    { name: 'store', label: 'Loja' },
    { name: 'shopping-bag', label: 'Sacola' },
    { name: 'shopping-cart', label: 'Carrinho' },
    { name: 'cpu', label: 'Eletrônicos' },
    { name: 'home', label: 'Casa' },
    { name: 'shirt', label: 'Moda' },
    { name: 'book-open', label: 'Livros' },
    { name: 'gamepad-2', label: 'Jogos' },
    { name: 'heart', label: 'Favoritos' },
    { name: 'star', label: 'Destaques' },
    { name: 'gift', label: 'Presentes' },
    { name: 'wrench', label: 'Ferramentas' },
  ] as const;
  protected readonly filteredCategoryIcons = computed(() => {
    const search = this.iconSearch().trim().toLocaleLowerCase('pt-BR');
    if (!search) return this.categoryIcons;
    return this.categoryIcons.filter(
      (item) => item.name.includes(search) || item.label.toLocaleLowerCase('pt-BR').includes(search),
    );
  });
  protected readonly logo = signal('');
  protected readonly logoFileName = signal('');
  protected readonly feedback = signal('');
  protected readonly failed = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    fonte: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    nome: ['', Validators.required],
    categorias: this.fb.array<ReturnType<FontesListPage['categoryGroup']>>([]),
  });
  protected readonly categoryForm = this.fb.nonNullable.group({
    id: this.fb.nonNullable.control<string>(crypto.randomUUID()),
    categoria: ['', Validators.required],
    icone: 'tag',
    url: ['', [Validators.required, Validators.pattern(/^https?:\/\//i)]],
    ativa: false,
    seletores: this.fb.nonNullable.group({
      item: '',
      titulo: '',
      preco: '',
      precoAntigo: '',
      imagem: '',
      url: '',
      paginaVirtualizada: false,
      carregarMais: '',
    }),
  });
  protected get categories() {
    return this.form.controls.categorias;
  }
  constructor() {
    this.reload();
  }
  private reload(): void {
    this.api.config(true).subscribe({
      next: (c) => {
        this.config.set(c);
        this.loading.set(false);
      },
      error: (e) => {
        this.fail(e);
        this.loading.set(false);
      },
    });
  }
  protected selectLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 700 * 1024) {
      this.feedback.set('O logo deve ter no máximo 700 KB.');
      this.failed.set(true);
      input.value = '';
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      this.feedback.set('Use uma logo PNG, JPEG, WebP ou SVG.');
      this.failed.set(true);
      input.value = '';
      return;
    }
    this.logoFileName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => this.logo.set(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  }
  protected clearLogo(): void {
    this.logo.set('');
    this.logoFileName.set('');
  }
  protected cancelForm(): void {
    this.showForm.set(false);
    this.form.reset();
    this.categories.clear();
    this.clearLogo();
    this.feedback.set('');
    this.failed.set(false);
  }
  protected startCategory(source: string): void {
    this.editingCategoryId.set(null);
    this.resetCategoryForm();
    this.categorySource.set(source);
  }
  protected startEditCategory(source: ConfiguredSource, category: SourceCategory): void {
    this.categorySource.set(source.fonte);
    this.editingCategoryId.set(category.id);
    this.iconPickerOpen.set(false);
    this.iconSearch.set('');
    this.categoryForm.reset({
      id: category.id,
      categoria: category.categoria,
      icone: category.icone || 'tag',
      url: category.url,
      ativa: category.ativa,
      seletores: category.seletores,
    });
  }
  protected cancelCategory(): void {
    this.categorySource.set(null);
    this.editingCategoryId.set(null);
    this.iconPickerOpen.set(false);
    this.iconSearch.set('');
    this.resetCategoryForm();
  }
  protected toggleIconPicker(): void {
    this.iconSearch.set('');
    this.iconPickerOpen.update((open) => !open);
  }
  protected setIconSearch(event: Event): void {
    this.iconSearch.set((event.target as HTMLInputElement).value);
  }
  protected selectCategoryIcon(icon: string): void {
    this.categoryForm.controls.icone.setValue(icon);
    this.iconPickerOpen.set(false);
    this.iconSearch.set('');
  }
  protected saveCategory(source: ConfiguredSource): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    const config = this.config();
    if (!config) return;
    const category = this.categoryForm.getRawValue() as SourceCategory;
    const changed: ScrapingConfig = {
      ...config,
      fontes: config.fontes.map((item) =>
          item.fonte === source.fonte
          ? {
              ...item,
              categorias: this.editingCategoryId() === category.id
                ? item.categorias.map((itemCategory) =>
                    itemCategory.id === category.id ? category : itemCategory,
                  )
                : [...item.categorias, category],
            }
          : item,
      ),
    };
    this.categorySaving.set(true);
    this.api.save(changed).subscribe({
      next: (saved) => {
        this.config.set(saved);
        this.categorySaving.set(false);
        this.cancelCategory();
        this.success('Categoria adicionada.');
      },
      error: (error) => {
        this.categorySaving.set(false);
        this.fail(error);
      },
    });
  }
  private resetCategoryForm(): void {
    this.categoryForm.reset({
      id: crypto.randomUUID(),
      categoria: '',
      icone: 'tag',
      url: '',
      ativa: false,
      seletores: {
        item: '',
        titulo: '',
        preco: '',
        precoAntigo: '',
        imagem: '',
        url: '',
        paginaVirtualizada: false,
        carregarMais: '',
      },
    });
  }
  protected add(): void {
    const nome = this.form.controls.nome.value.trim();
    this.form.controls.fonte.setValue(this.gerarIdentificador(nome));
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.api
      .add({
        fonte: this.form.controls.fonte.value,
        nome: this.form.controls.nome.value,
        logo: this.logo(),
        categorias: this.categories.getRawValue(),
      })
      .subscribe({
      next: (c) => {
        this.config.set(c);
        this.form.reset();
        this.categories.clear();
        this.clearLogo();
        this.showForm.set(false);
        this.success('Fonte adicionada.');
      },
      error: (e) => this.fail(e),
      });
  }
  private categoryGroup() {
    return this.fb.nonNullable.group({
      id: this.fb.nonNullable.control<string>(crypto.randomUUID()),
      categoria: ['', Validators.required],
      icone: 'tag',
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\//i)]],
      ativa: false,
      seletores: this.fb.nonNullable.group({
        item: '',
        titulo: '',
        preco: '',
        precoAntigo: '',
        imagem: '',
        url: '',
        paginaVirtualizada: false,
        carregarMais: '',
      }),
    });
  }
  protected addCategory(): void {
    this.categories.push(this.categoryGroup());
  }
  protected removeCategoryDraft(index: number): void {
    this.categories.removeAt(index);
  }
  private gerarIdentificador(nome: string): string {
    return nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
  }
  protected fieldError(control: 'fonte' | 'nome'): string {
    const field = this.form.controls[control];
    if (!field.touched || field.valid) return '';
    if (field.hasError('required'))
      return `${control === 'fonte' ? 'Identificador' : 'Nome exibido'} é obrigatório.`;
    return 'Use apenas letras minúsculas, números e hífen.';
  }
  protected toggle(source: ConfiguredSource, event: Event): void {
    const config = this.config();
    if (!config) return;
    const previousValue = source.ativa;
    const nextValue = (event.target as HTMLInputElement).checked;
    const changed = {
      ...config,
      fontes: config.fontes.map((item) =>
        item.fonte === source.fonte ? { ...item, ativa: nextValue } : item,
      ),
    };
    this.config.set(changed);
    this.api.save(changed).subscribe({
      next: (c) => {
        this.config.set(c);
        this.success('Status atualizado.');
      },
      error: (e) => {
        this.config.update((current) =>
          current
            ? {
                ...current,
                fontes: current.fontes.map((item) =>
                  item.fonte === source.fonte ? { ...item, ativa: previousValue } : item,
                ),
              }
            : current,
        );
        this.fail(e);
      },
    });
  }
  protected toggleCategory(source: ConfiguredSource, category: SourceCategory, event: Event): void {
    const config = this.config();
    if (!config) return;
    const previousValue = category.ativa;
    const nextValue = (event.target as HTMLInputElement).checked;
    const changed: ScrapingConfig = {
      ...config,
      fontes: config.fontes.map((item) =>
        item.fonte === source.fonte
          ? {
              ...item,
              categorias: item.categorias.map((itemCategory) =>
                itemCategory.id === category.id
                  ? { ...itemCategory, ativa: nextValue }
                  : itemCategory,
              ),
            }
          : item,
      ),
    };
    this.config.set(changed);
    this.api.save(changed).subscribe({
      next: (saved) => {
        this.config.set(saved);
        this.success('Status da categoria atualizado.');
      },
      error: (error) => {
        this.config.update((current) =>
          current
            ? {
                ...current,
                fontes: current.fontes.map((item) =>
                  item.fonte === source.fonte
                    ? {
                        ...item,
                        categorias: item.categorias.map((itemCategory) =>
                          itemCategory.id === category.id
                            ? { ...itemCategory, ativa: previousValue }
                            : itemCategory,
                        ),
                      }
                    : item,
                ),
              }
            : current,
        );
        this.fail(error);
      },
    });
  }
  protected async remove(source: ConfiguredSource): Promise<void> {
    if (
      !(await this.popup.confirmDelete(
        `Excluir a fonte ${source.nome}?`,
        'Esta ação também removerá todas as categorias da fonte.',
      ))
    )
      return;
    this.api.remove(source.fonte).subscribe({
      next: (c) => {
        this.config.set(c);
        this.success('Fonte excluída.');
      },
      error: (e) => this.fail(e),
    });
  }
  protected async removeCategory(
    source: ConfiguredSource,
    category: ConfiguredSource['categorias'][number],
  ): Promise<void> {
    if (
      !(await this.popup.confirmDelete(
        `Excluir a categoria ${category.categoria || 'sem nome'}?`,
        `A categoria será removida da fonte ${source.nome}.`,
      ))
    )
      return;
    const config = this.config();
    if (!config) return;
    const changed = {
      ...config,
      fontes: config.fontes.map((item) =>
        item.fonte === source.fonte
          ? {
              ...item,
              categorias: item.categorias.filter((itemCategory) => itemCategory.id !== category.id),
            }
          : item,
      ),
    };
    this.config.set(changed);
    this.api.save(changed).subscribe({
      next: (saved) => {
        this.config.set(saved);
        this.success('Categoria excluída.');
      },
      error: (error) => {
        this.config.set(config);
        this.fail(error);
      },
    });
  }
  private success(message: string): void {
    this.feedback.set(message);
    this.failed.set(false);
    this.saving.set(false);
  }
  private fail(error: unknown): void {
    this.feedback.set(this.errors.message(error));
    this.failed.set(true);
    this.saving.set(false);
  }
}
