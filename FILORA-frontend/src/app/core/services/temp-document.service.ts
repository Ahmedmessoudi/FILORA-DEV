import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TempDocumentDto {
  id: number;
  filename: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  createdAt: string;
  ownerName: string;
}

@Injectable({
  providedIn: 'root'
})
export class TempDocumentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/temp-documents';

  getTempDocuments(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  upload(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  promote(id: number, companyId: number, docTypeId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/promote?companyId=${companyId}&docTypeId=${docTypeId}`, {});
  }
}
