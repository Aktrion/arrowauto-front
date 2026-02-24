import { HttpParams } from '@angular/common/http';

export enum HTTP_METHOD {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  PATCH = 'patch',
  DELETE = 'delete',
}

export interface RequestOptions {
  ignoreError?: boolean;
  withCredentials?: boolean;
  autoClose?: boolean;
  avoidLogout?: boolean;
  params?: HttpParams;
  responseType?: 'json' | 'blob' | 'text';
}

export interface SearchRequestResponse<T> {
  data: T[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
  pages: number;
}
