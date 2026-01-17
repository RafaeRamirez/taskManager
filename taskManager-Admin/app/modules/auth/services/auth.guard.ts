import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard  {
  constructor(private authService: AuthService) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const token = this.authService.token || localStorage.getItem('token');
    const user = this.authService.user || this.authService.currentUserValue;

    if (!user || !token) {
      this.authService.logout();
      return false;
    }

    const payload = this.decodeTokenPayload(token);
    if (!payload) {
      this.authService.logout();
      return false;
    }

    const exp = typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
    if (exp && Date.now() >= exp) {
      this.authService.logout();
      return false;
    }

    return true;
  }

  private decodeTokenPayload(token: string): { exp?: number } | null {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    // JWT payload is base64url-encoded.
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    try {
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }
}
