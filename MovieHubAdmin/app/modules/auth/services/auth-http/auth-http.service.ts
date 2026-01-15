import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UserModel } from '../../models/user.model';
import { environment } from '../../../../../environments/environment';
import { AuthModel } from '../../models/auth.model';

const API_USERS_URL = `${environment.apiUrl}/auth`;

@Injectable({
  providedIn: 'root',
})
export class AuthHTTPService {
  constructor(private http: HttpClient) {}

  // public methods
  login(email: string, password: string): Observable<any> {
    return this.http
      .post<{ access_token: string; expires_in: number }>(
        `${API_USERS_URL}/login`,
        { email, password }
      )
      .pipe(
        map((result) => {
          const auth = new AuthModel();
          auth.authToken = result.access_token;
          auth.refreshToken = '';
          auth.expiresIn = new Date(Date.now() + result.expires_in * 1000);
          return auth;
        })
      );
  }

  // CREATE =>  POST: add a new user to the server
  createUser(user: UserModel): Observable<UserModel> {
    return this.http.post<UserModel>(`${API_USERS_URL}/register`, user);
  }

  // Your server should check email => If email exists send link to the user and return true | If email doesn't exist return false
  forgotPassword(email: string): Observable<boolean> {
    return this.http.post<boolean>(`${API_USERS_URL}/forgot-password`, {
      email,
    });
  }

  resetPassword(
    email: string,
    token: string,
    password: string,
    passwordConfirmation: string
  ): Observable<boolean> {
    return this.http.post<boolean>(`${API_USERS_URL}/reset-password`, {
      email,
      token,
      password,
      password_confirmation: passwordConfirmation,
    });
  }

  getUserByToken(token: string): Observable<UserModel> {
    const httpHeaders = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post<UserModel>(`${API_USERS_URL}/me`, {}, {
      headers: httpHeaders,
    });
  }
}
