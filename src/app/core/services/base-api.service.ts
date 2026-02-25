import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastService } from '@core/services/toast.service';
import { RequestOptions } from '@core/models/request.model';
import { Observable, throwError } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';
import { environment } from '@env/environment';
import { HTTP_METHOD } from '@core/models/request.model';

export class BaseApiService {
  protected http = inject(HttpClient);
  protected toast = inject(ToastService);

  constructor(protected controllerPrefix?: string) {
    if (!this.controllerPrefix) this.controllerPrefix = '';
  }

  private getDefaultHeaders(): Record<string, string> {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      'X-User-Timezone': userTimezone,
    };
  }

  protected get<T>(endpoint: string, options?: RequestOptions): Observable<T> {
    return this.makeRequest<T>(HTTP_METHOD.GET, endpoint, options);
  }

  protected delete<T>(endpoint: string, options?: RequestOptions): Observable<T> {
    return this.makeRequest<T>(HTTP_METHOD.DELETE, endpoint, options);
  }

  protected post<T>(endpoint: string, body: any, options?: RequestOptions): Observable<T> {
    return this.makeRequest<T>(HTTP_METHOD.POST, endpoint, options, body);
  }

  protected put<T>(endpoint: string, body: any, options?: RequestOptions): Observable<T> {
    return this.makeRequest<T>(HTTP_METHOD.PUT, endpoint, options, body);
  }
  protected patch<T>(endpoint: string, body: any, options?: RequestOptions): Observable<T> {
    return this.makeRequest<T>(HTTP_METHOD.PATCH, endpoint, options, body);
  }

  protected downloadFile(
    endpoint: string,
    body: any,
    filename?: string,
    method: HTTP_METHOD = HTTP_METHOD.POST,
    mimeType: string = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ): Observable<void> {
    const httpOptions = {
      withCredentials: true,
      responseType: 'blob' as const,
      observe: 'response' as const,
      headers: this.getDefaultHeaders(),
    };

    const url = environment.apiUrl + this.controllerPrefix + endpoint;
    const methodMap = {
      [HTTP_METHOD.GET]: () => this.http.get(url, httpOptions),
      [HTTP_METHOD.POST]: () => this.http.post(url, body, httpOptions),
      [HTTP_METHOD.PUT]: () => this.http.put(url, body, httpOptions),
      [HTTP_METHOD.PATCH]: () => this.http.patch(url, body, httpOptions),
      [HTTP_METHOD.DELETE]: () => this.http.delete(url, httpOptions),
    };

    const requestObservable = methodMap[method];
    if (!requestObservable) throw new Error('Invalid HTTP method');

    return requestObservable().pipe(
      catchError((error) => throwError(() => error)),
      map((response: any) => {
        const finalFilename =
          filename ||
          this.extractFilename(response.headers.get('Content-Disposition')) ||
          'download.xlsx';
        this.downloadFile(response.body, finalFilename, mimeType);
      }),
      take(1),
    );
  }

  private extractFilename(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;

    const patterns = [/filename="([^"]+)"/i, /filename=([^;\s]+)/i, /filename\*=UTF-8''([^;\s]+)/i];

    for (const pattern of patterns) {
      const match = contentDisposition.match(pattern);
      if (match?.[1]) {
        return pattern.source.includes('UTF-8') ? decodeURIComponent(match[1]) : match[1];
      }
    }

    return null;
  }

  private makeRequest<T>(
    method: HTTP_METHOD,
    endpoint: string,
    options: RequestOptions = {},
    body?: any,
  ): Observable<T> {
    const {
      ignoreError = false,
      withCredentials = true,
      autoClose = true,
      avoidLogout = false,
      params,
      responseType = 'json',
    } = options;

    const httpOptions: any = {
      withCredentials,
      params,
      responseType,
      headers: this.getDefaultHeaders(),
    };

    let requestObservable: Observable<T>;

    const url = environment.apiUrl + this.controllerPrefix + endpoint;

    switch (method) {
      case HTTP_METHOD.GET:
        requestObservable = this.http.get<T>(url, httpOptions) as Observable<T>;
        break;
      case HTTP_METHOD.DELETE:
        requestObservable = this.http.delete<T>(url, httpOptions) as Observable<T>;
        break;
      case HTTP_METHOD.POST:
        requestObservable = this.http.post<T>(url, body, httpOptions) as Observable<T>;
        break;
      case HTTP_METHOD.PATCH:
        requestObservable = this.http.patch<T>(url, body, httpOptions) as Observable<T>;
        break;
      case HTTP_METHOD.PUT:
        requestObservable = this.http.put<T>(url, body, httpOptions) as Observable<T>;
        break;
      default:
        throw new Error('Invalid HTTP method');
    }

    return requestObservable
      .pipe(catchError((err) => this.handleError<T>(err, ignoreError, avoidLogout)))
      .pipe(autoClose ? take(1) : (obs) => obs);
  }

  private handleError<T>(
    response: HttpErrorResponse,
    ignoreError: boolean,
    avoidLogout: boolean,
  ): Observable<T> {
    const message = this.extractErrorMessage(response);

    if (response.status !== 500 && !!message && !ignoreError) {
      this.toast.error(message);
    }

    // if (response.status === 401 && !avoidLogout) {
    //   this.logoutHandler.triggerLogout();
    // }

    return throwError(() => new Error(message)) as Observable<T>;
  }

  private extractErrorMessage(response: HttpErrorResponse): string {
    const errorMessage = response.error?.message;

    if (Array.isArray(errorMessage)) {
      return errorMessage.map((err, index) => `- ${err}`).join('\n');
    }

    return typeof errorMessage === 'string'
      ? errorMessage
      : errorMessage?.message || 'Unknown error';
  }

  protected normalizeArrayResponse<T>(response: any): T[] {
    if (Array.isArray(response)) {
      return response as T[];
    }
    if (Array.isArray(response?.data)) {
      return response.data as T[];
    }
    return [];
  }

  protected normalizeSingleResponse<T>(response: any): T | null {
    if (!response) {
      return null;
    }
    if (response?.data && !Array.isArray(response.data)) {
      return response.data as T;
    }
    return response as T;
  }
}
