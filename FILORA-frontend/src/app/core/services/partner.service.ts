import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PartnerDto {
  id?: number;
  companyName: string;
  tradeName?: string;
  uniqueIdentifier: string;
  mailingAddress: string;
  billingAddress?: string;
  phone1: string;
  phone2?: string;
  phone3?: string;
  email: string;
  paymentTerms?: string;
  billingTerms?: string;
  bankAccountNumber?: string;
  bankName?: string;
  notes?: string;
  isActive: boolean;
  assignedCompanyIds: number[];
  partnerTypeIds: number[];
}

@Injectable({
  providedIn: 'root'
})
export class PartnerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/partners';

  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  create(partner: PartnerDto): Observable<any> {
    return this.http.post<any>(this.apiUrl, partner);
  }

  update(id: number, partner: PartnerDto): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, partner);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
