import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DocTypeDto {
  id?: number;
  name: string;
  status: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DocTypeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/doctypes';

  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  create(docType: DocTypeDto): Observable<any> {
    return this.http.post<any>(this.apiUrl, docType);
  }

  update(id: number, docType: DocTypeDto): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, docType);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  getAssignedEntities(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/entities`);
  }

  assignEntity(id: number, entityId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/assign/${entityId}`, {});
  }

  unassignEntity(id: number, entityId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/unassign/${entityId}`, {});
  }
}
