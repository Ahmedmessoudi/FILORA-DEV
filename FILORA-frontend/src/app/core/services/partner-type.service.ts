import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PartnerTypeDto {
  id?: number;
  name: string;
  status: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PartnerTypeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/partner-types';

  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  create(partnerType: PartnerTypeDto): Observable<any> {
    return this.http.post<any>(this.apiUrl, partnerType);
  }

  update(id: number, partnerType: PartnerTypeDto): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, partnerType);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
