import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, of, Subscription } from 'rxjs';
import { map, catchError, switchMap, finalize } from 'rxjs/operators';
import { UserModel } from '../models/user.model';
import { AuthModel } from '../models/auth.model';
import { AuthHTTPService } from './auth-http';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

export type UserType = UserModel | undefined;

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  // private fields
  private unsubscribe: Subscription[] = []; // Read more: => https://brianflove.com/2016/12/11/anguar-2-unsubscribe-observables/
  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

  // public fields
  currentUser$: Observable<UserType>;
  isLoading$: Observable<boolean>;
  currentUserSubject: BehaviorSubject<UserType>;
  isLoadingSubject: BehaviorSubject<boolean>;

  get currentUserValue(): UserType {
    return this.currentUserSubject.value;
  }

  set currentUserValue(user: UserType) {
    this.currentUserSubject.next(user);
  }

  token: any;
  user: any;

  constructor(
    private authHttpService: AuthHTTPService,
    private router: Router,
    private http: HttpClient
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.currentUserSubject = new BehaviorSubject<UserType>(undefined);
    this.currentUser$ = this.currentUserSubject.asObservable();
    this.isLoading$ = this.isLoadingSubject.asObservable();
    const subscr = this.getUserByToken().subscribe();
    this.unsubscribe.push(subscr);
  }

  // public methods
  login(email: string, password: string): Observable<UserType> {
    this.isLoadingSubject.next(true);
    return this.http
      .post<{ access_token: string; expires_in: number; user?: unknown }>(
        `${environment.URL_SERVICIOS}/auth/login`,
        { email, password }
      )
      .pipe(
        map((auth: any) => {
          this.setAuthFromLocalStorage(auth);
          return auth;
        }),
        switchMap(() => this.getUserByToken()),
        catchError((err) => {
          console.error('err', err);
          return of(undefined);
        }),
        finalize(() => this.isLoadingSubject.next(false))
      );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(this.authLocalStorageToken);
    this.router.navigate(['/auth/login'], {
      queryParams: {},
    });
  }

  getUserByToken(): Observable<UserType> {
    const auth = this.getAuthFromLocalStorage();
    if (!auth) {
      return of(undefined);
    }

    this.isLoadingSubject.next(true);
    return of(auth).pipe(
      map((user: any) => {
        const normalizedUser = user ? this.normalizeUser(user) : undefined;
        if (normalizedUser) {
          this.currentUserSubject.next(normalizedUser);
        } else {
          this.logout();
        }
        return normalizedUser;
      }),
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // need create new user then login
  registration(user: UserModel): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.authHttpService.createUser(user).pipe(
      map(() => {
        this.isLoadingSubject.next(false);
      }),
      switchMap(() => this.login(user.email, user.password)),
      catchError((err) => {
        console.error('err', err);
        return of(undefined);
      }),
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  forgotPassword(email: string): Observable<boolean> {
    this.isLoadingSubject.next(true);
    return this.authHttpService
      .forgotPassword(email)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  resetPassword(
    email: string,
    token: string,
    password: string,
    passwordConfirmation: string
  ): Observable<boolean> {
    this.isLoadingSubject.next(true);
    return this.authHttpService
      .resetPassword(email, token, password, passwordConfirmation)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  // private methods
  private setAuthFromLocalStorage(auth: any): boolean {
    // store auth authToken/refreshToken/epiresIn in local storage to keep user logged in between page refreshes
    if (auth && auth.access_token) {
      localStorage.setItem('token', auth.access_token);
      localStorage.setItem('user', JSON.stringify(auth.user));
      return true;
    }
    return false;
  }

  private getAuthFromLocalStorage(): AuthModel | undefined {
    try {
      const lsValue = localStorage.getItem('user');
      if (!lsValue) {
        return undefined;
      }

      this.token = localStorage.getItem('token');
      this.user = JSON.parse(lsValue);
      const authData = this.user;
      return authData;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  private normalizeUser(user: unknown): UserModel {
    const data = user as Partial<UserModel> & {
      full_name?: string;
      avatar?: string | null;
      name?: string;
    };

    const model = new UserModel();
    const fullName =
      data.full_name || data.fullname || data.name || data.firstname || '';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = data.firstname || nameParts[0] || '';
    const lastName =
      data.lastname || nameParts.slice(1).join(' ') || '';

    model.id = data.id ?? 0;
    model.username = data.username || data.email || '';
    model.fullname = fullName;
    model.firstname = firstName;
    model.lastname = lastName;
    model.email = data.email || '';
    model.pic = data.avatar || data.pic || './assets/media/avatars/blank.png';
    model.roles = data.roles || [];
    model.occupation = data.occupation || '';
    model.companyName = data.companyName || '';
    model.phone = data.phone || '';
    model.address = data.address;
    model.socialNetworks = data.socialNetworks;

    return model;
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
