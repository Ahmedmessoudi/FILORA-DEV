import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SettingsService } from './core/services/settings.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Filora DMS');
  private readonly settingsService = inject(SettingsService);

  constructor() {
    effect(() => {
      const systemName = this.settingsService.systemName();
      this.title.set(systemName);
      document.title = systemName;
    });

    this.settingsService.getAll().subscribe({
      error: () => {
        document.title = this.title();
      }
    });
  }
}
