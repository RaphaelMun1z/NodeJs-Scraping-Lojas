import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiUrl;
export const apiUrl = (path: string): string => `${API_BASE_URL}${path}`;
