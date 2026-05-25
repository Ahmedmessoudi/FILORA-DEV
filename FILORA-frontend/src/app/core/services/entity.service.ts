import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EntityDto {
  id?: number;
  name: string;
  address: string;
  email: string;
  phone: string;
  isActive: boolean;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EntityService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/entities';

  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getActive(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/active`);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  create(entity: EntityDto): Observable<any> {
    return this.http.post<any>(this.apiUrl, entity);
  }

  update(id: number, entity: EntityDto): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
