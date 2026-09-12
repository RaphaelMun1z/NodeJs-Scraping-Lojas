import { AfterViewChecked, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  ArrowRight,
  Braces,
  ChartNoAxesCombined,
  Check,
  createIcons,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  Filter,
  Globe2,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  LockKeyhole,
  List,
  Mail,
  LogOut,
  Monitor,
  Package,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Save,
  ScanSearch,
  Search,
  SearchCheck,
  ServerCog,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Timer,
  Trash2,
  TriangleAlert,
  Tag,
  Upload,
  X,
} from 'lucide';
import { RouterOutlet } from '@angular/router';
import { AuthApiService } from './core/auth/auth-api.service';
import { HeaderComponent } from './layout/header/header';

@Component({
  imports: [RouterOutlet, HeaderComponent],
  selector: 'app-root',
  template: `<app-header /><router-outlet />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements AfterViewChecked {
  private readonly auth = inject(AuthApiService);
  constructor() {
    this.auth.session().subscribe();
  }
  ngAfterViewChecked(): void {
    createIcons({ icons: {
      ArrowLeft, ArrowRight, Braces, ChartNoAxesCombined, Check, ChevronLeft, ChevronRight,
      Clock3, Download, ExternalLink, Filter, Globe2, Eye, EyeOff, Info, KeyRound, LockKeyhole, List, LogOut, Mail, Monitor,
      Package, Pencil, Plus, Printer, RotateCcw, Save, ScanSearch, Search, SearchCheck,
      ServerCog, Settings, ShieldCheck, Sparkles, Store, Tag, Timer, Trash2, TriangleAlert, Upload, X,
    } });
  }
}
