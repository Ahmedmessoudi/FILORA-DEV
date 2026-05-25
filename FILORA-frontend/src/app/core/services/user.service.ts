import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserDto {
  id?: number;
  username: string;
  surname: string;
  email: string;
  role: string;
  language: 'fr' | 'en';
  isActive: boolean;
  twoFaEnabled: boolean;
  hasTemporaryPassword?: boolean;
  password?: string; // used for create
  assignedCompanyIds: number[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/users';

  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  create(user: UserDto): Observable<any> {
    return this.http.post<any>(this.apiUrl, user);
  }

  update(id: number, user: UserDto): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, user);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  toggleActive(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/toggle-active`, {});
  }

  resetPassword(id: number, newPassword: string): Observable<any> {
    const params = new HttpParams().set('newPassword', newPassword);
    return this.http.post<any>(`${this.apiUrl}/${id}/reset-password`, {}, { params });
  }
}
