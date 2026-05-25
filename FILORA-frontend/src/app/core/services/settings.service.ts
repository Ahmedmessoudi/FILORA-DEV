import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AppSetting {
  key: string;
  value: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/settings';
  private readonly settingsMap = signal<Record<string, string>>({});

  readonly systemName = computed(() => {
    const value = this.settingsMap()['SYSTEM_NAME']?.trim();
    return value || 'Filora DMS';
  });

  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl).pipe(
      tap((res: any) => {
        if (res?.success && Array.isArray(res.data)) {
          this.applySettings(res.data);
        }
      })
    );
  }

  update(settingsMap: { [key: string]: string }): Observable<any> {
    return this.http.put<any>(this.apiUrl, settingsMap).pipe(
      tap((res: any) => {
        if (res?.success) {
          this.settingsMap.update((current: Record<string, string>) => ({
            ...current,
            ...settingsMap
          }));
        }
      })
    );
  }

  private applySettings(settings: AppSetting[]) {
    const next: Record<string, string> = {};
    for (const setting of settings) {
      next[setting.key] = setting.value ?? '';
    }
    this.settingsMap.set(next);
  }
}
