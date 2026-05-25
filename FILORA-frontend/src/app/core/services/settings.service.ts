import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  update(settingsMap: { [key: string]: string }): Observable<any> {
    return this.http.put<any>(this.apiUrl, settingsMap);
  }
}
