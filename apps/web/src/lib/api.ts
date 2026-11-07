import axios from "axios";
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api", withCredentials: true });
export const assetUrl = (path: string | null) => path ? `${(import.meta.env.VITE_API_URL ?? "http://localhost:4000/api").replace(/\/api\/?$/, "")}${path}` : null;
api.interceptors.request.use((config) => { const token = localStorage.getItem("accessToken"); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
let refreshing: Promise<string> | null = null;
api.interceptors.response.use(undefined, async (error) => {
  const request = error.config;
  if (error.response?.status !== 401 || request?._retry || request?.url?.includes("/auth/")) throw error;
  request._retry = true;
  refreshing ??= api.post("/auth/refresh").then((response) => response.data.accessToken).finally(() => { refreshing = null; });
  const token = await refreshing;
  localStorage.setItem("accessToken", token);
  request.headers.Authorization = `Bearer ${token}`;
  return api(request);
});
