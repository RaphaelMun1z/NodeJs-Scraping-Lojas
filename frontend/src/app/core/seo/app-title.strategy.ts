import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';

const BRAND = 'Comparaê';
const DEFAULT_TITLE = `${BRAND} — Compare produtos e preços`;
const DEFAULT_DESCRIPTION =
  'Comparaê ajuda você a comparar produtos, acompanhar preços e encontrar melhores ofertas.';

interface SeoRouteData {
  title?: string;
  description?: string;
  indexable?: boolean;
}

@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const data = this.getRouteData(snapshot);
    const pageTitle = data.title ? `${data.title} | ${BRAND}` : DEFAULT_TITLE;
    const description = data.description ?? DEFAULT_DESCRIPTION;
    const robots = data.indexable === false ? 'noindex, nofollow' : 'index, follow';
    const canonicalUrl = this.getCanonicalUrl(snapshot.url);

    this.titleService.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: robots });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.setCanonicalLink(canonicalUrl);
  }

  private getRouteData(snapshot: RouterStateSnapshot): SeoRouteData {
    let route: ActivatedRouteSnapshot | null = snapshot.root;
    const data: SeoRouteData = {};

    while (route) {
      Object.assign(data, route.data as SeoRouteData);
      route = route.firstChild;
    }

    return data;
  }

  private getCanonicalUrl(url: string): string {
    const path = url.split(/[?#]/, 1)[0] || '/';
    const origin = this.document.defaultView?.location.origin;

    return origin && origin !== 'null' ? new URL(path, origin).toString() : path;
  }

  private setCanonicalLink(canonicalUrl: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }

    link.href = canonicalUrl;
  }
}
