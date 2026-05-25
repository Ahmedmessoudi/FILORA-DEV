import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DocumentDto {
  id: number;
  filename: string;
  originalFilename?: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  isInvoice: boolean;
  invoiceNumber?: string;
  documentDate?: string;
  dueDate?: string;
  totalHt?: number;
  tvaRate?: number;
  tva?: number;
  totalTtc?: number;
  currency?: string;
  ocrStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  extractedText?: string;
  extractedData?: any;
  rapport?: string;
  createdAt: string;
  ownerName: string;
  companyName: string;
  docTypeName: string;
  partnerId?: number;
  partnerName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/documents';

  search(params: {
    companyId: number;
    docTypeId?: number;
    query?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: string;
  }): Observable<any> {
    let httpParams = new HttpParams()
      .set('companyId', params.companyId.toString())
      .set('page', (params.page ?? 0).toString())
      .set('size', (params.size ?? 10).toString())
      .set('sortBy', params.sortBy ?? 'createdAt')
      .set('direction', params.direction ?? 'desc');

    if (params.docTypeId) {
      httpParams = httpParams.set('docTypeId', params.docTypeId.toString());
    }
    if (params.query) {
      httpParams = httpParams.set('query', params.query);
    }

    return this.http.get<any>(`${this.apiUrl}/search`, { params: httpParams });
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  getPreviewBlob(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/preview`, { responseType: 'blob' });
  }

  getDownloadBlob(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/download`, { responseType: 'blob' });
  }

  upload(file: File, companyId: number, docTypeId: number): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('companyId', companyId.toString());
    formData.append('docTypeId', docTypeId.toString());

    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
  }

  update(id: number, doc: Partial<DocumentDto>, partnerId?: number): Observable<any> {
    let url = `${this.apiUrl}/${id}`;
    if (partnerId) {
      url += `?partnerId=${partnerId}`;
    }
    return this.http.put<any>(url, doc);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  bulkDelete(ids: number[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bulk-delete`, ids);
  }

  reprocessOcr(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/reprocess-ocr`, {});
  }

  share(id: number, shareData: {
    recipientEmail: string;
    subject?: string;
    body?: string;
    attachOriginal?: boolean;
    attachOcrText?: boolean;
    attachOcrJson?: boolean;
  }): Observable<any> {
    let httpParams = new HttpParams()
      .set('recipientEmail', shareData.recipientEmail)
      .set('attachOriginal', (shareData.attachOriginal ?? true).toString())
      .set('attachOcrText', (shareData.attachOcrText ?? false).toString())
      .set('attachOcrJson', (shareData.attachOcrJson ?? false).toString());

    if (shareData.subject) {
      httpParams = httpParams.set('subject', shareData.subject);
    }
    if (shareData.body) {
      httpParams = httpParams.set('body', shareData.body);
    }

    return this.http.post<any>(`${this.apiUrl}/${id}/share`, {}, { params: httpParams });
  }

  getPreviewUrl(id: number): string {
    return `${this.apiUrl}/${id}/preview`;
  }

  getDownloadUrl(id: number): string {
    return `${this.apiUrl}/${id}/download`;
  }
}
