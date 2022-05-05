import { AxiosInstance } from "axios";


export interface AuthConfig {
    accessTokenCache: ValueCache
    logOutHandler: () => void
    refreshTokenCache?: ValueCache
    refreshTokenExpiry: number | null
    accessTokenGenerator?: (axios:AxiosInstance, refreshToken: string) => Promise<AccessTokenResponse | null>
}

export interface ValueCache {
    drop(): Promise<void>
    read(): Promise<string | null>
    write(value: string, expiryInSeconds: number | null): Promise<void>
}

export interface AccessTokenResponse {
    accessToken: string
    refreshToken: string
    accessTokenExpiry: number
}

export interface AuthParams {
    accessTokenCache?: ValueCache
    logOutHandler?: () => void
    refreshTokenCache?: ValueCache
    refreshTokenExpiry?: number | null
    accessTokenGenerator?: (axios:AxiosInstance, refreshToken: string) => Promise<AccessTokenResponse | null>
}

export interface AuthApi {
    login: (tokens: AccessTokenResponse) => void
    logout: () => void
    isLoggedIn: boolean
}