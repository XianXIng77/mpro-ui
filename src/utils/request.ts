import axios, { AxiosRequestConfig } from 'axios'
import { ACCESS_INVALIDATED_EVENT, clearAuthToken, getAuthorization } from './auth-token'

interface ApiResult<T> {
  code: number
  msg?: string
  data?: T
}

export class ApiError extends Error {
  constructor(message: string, public code: number) {
    super(message)
    this.name = 'ApiError'
  }
}

function isPublicAuthRequest(config: AxiosRequestConfig): boolean {
  return config.url === '/auth/login' || config.url === '/auth/register'
}

function fail(code: number, message: string, config: AxiosRequestConfig): never {
  // 较早请求的 401 不能清除用户刚登录得到的新令牌。
  if (code === 401 && !isPublicAuthRequest(config) &&
      (config.headers?.Authorization || null) === getAuthorization()) {
    clearAuthToken()
  }
  if (code === 403 && config.url !== '/access/current' &&
      (config.headers?.Authorization || null) === getAuthorization()) {
    window.dispatchEvent(new Event(ACCESS_INVALIDATED_EVENT))
  }
  throw new ApiError(message, code)
}

const client = axios.create({
  baseURL: '/api',
  timeout: 30000
})

/** 复用相同的鉴权配置下载文件，并解析后端返回的 JSON 错误。 */
export async function requestBlob(config: AxiosRequestConfig): Promise<Blob> {
  return request<Blob>({ ...config, responseType: 'blob' })
}

client.interceptors.request.use(config => {
  if (!config.url?.startsWith('/') || config.url.startsWith('//')) {
    throw new Error('请求地址必须是站内 API 路径')
  }
  const authorization = getAuthorization()
  if (authorization && !isPublicAuthRequest(config)) {
    config.headers.set('Authorization', authorization)
  }
  return config
})

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await client.request<ApiResult<T> | Blob>(config)
    if (config.responseType === 'blob' && response.data instanceof Blob && !response.data.type.includes('json')) {
      return response.data as unknown as T
    }
    const result = await readResult<T>(response.data)
    if (!result || typeof result.code !== 'number') {
      throw new Error('服务返回了无法识别的数据')
    }
    if (result.code !== 200) {
      fail(result.code, result.msg || '操作失败，请稍后重试', response.config)
    }
    return result.data as T
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        throw new ApiError(error.code === 'ECONNABORTED' ? '请求超时，请稍后重试' : '无法连接服务，请确认后端已启动', 0)
      }
      const result = await readResult<unknown>(error.response.data)
      fail(error.response.status, result?.msg || (error.response.status === 401
        ? '登录状态已失效，请登录后重试'
        : `请求失败（HTTP ${error.response.status}）`), error.config || config)
    }
    throw error
  }
}

async function readResult<T>(data: unknown): Promise<ApiResult<T> | undefined> {
  if (data instanceof Blob) {
    try { return JSON.parse(await data.text()) as ApiResult<T> } catch { return undefined }
  }
  return data && typeof data === 'object' ? data as ApiResult<T> : undefined
}
