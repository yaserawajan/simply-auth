import { AxiosInstance } from "axios";


export interface AuthApp {
    accessTokenCache: ValueRepo
    logOutHandler: () => void
    refreshTokenCache: ValueRepo | null
    refreshTokenExpiry: number | null
    accessTokenGenerator?: (axios:AxiosInstance, refreshToken: string) => Promise<AccessTokenResponse | null>
}

export interface ValueRepo {
    drop(): void
    read(): string | null
    write(value: string, expiryInSeconds: number | null): void
}

export interface AccessTokenResponse {
    accessToken: string
    refreshToken: string
    accessTokenExpiry: number
}

export interface SimplyAuthOptions {
    accessTokenRepo?: ValueRepo
    logOutHandler?: () => void
    refreshTokenRepo?: ValueRepo
    refreshTokenExpiry?: number | null
    accessTokenGenerator?: (axios:AxiosInstance, refreshToken: string) => Promise<AccessTokenResponse | null>
}

export interface AuthApi {
    login: (tokens: AccessTokenResponse) => void
    logout: () => void
    isLoggedIn: () => boolean
}