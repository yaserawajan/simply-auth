import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance, AxiosError } from "axios";


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
    accessTokenGenerator?: (axios:AxiosInstance, refreshToken: string) => Promise<AccessTokenResponse>
}

export class MemoryRepo implements ValueRepo {

    value: string | null

    constructor(initValue?: string) {
        this.value = initValue ?? null;
    }

    drop(): void {
        this.value = null;
    }

    read(): string | null {
        return this.value;
    }

    write(value: string, expiryInSeconds: number | null): void {
        this.value = value;
    }
}

export class ValueCache implements ValueRepo {

    decoratee: ValueRepo
    value: string | null

    constructor(decoratee: ValueRepo) {
        this.decoratee = decoratee;
        this.value = decoratee.read();
    }

    read() {
        return this.value;
    }

    write(value:string, expiry: number | null) {
        this.value = value;
        this.decoratee.write(value, expiry);
    }

    drop() {
        this.value = null;
        this.decoratee.drop();
    }
}

export class LocalStorage implements ValueRepo {

    key: string

    constructor(key: string) {
        this.key = key;
    }

    drop(): void {
        localStorage.removeItem(this.key);
    }

    read(): string | null {
        return localStorage.getItem(this.key);
    }

    write(value: string, expiry: number | null): void {
        localStorage.setItem(this.key, value);
    }
}

export class SessionStorage implements ValueRepo {

    key: string

    constructor(key: string) {
        this.key = key;
    }

    drop(): void {
        sessionStorage.removeItem(this.key);
    }

    read(): string | null {
        return sessionStorage.getItem(this.key);
    }

    write(value: string, expiryInSeconds: number | null): void {
        sessionStorage.setItem(this.key, value);
    }
}

const SIGNIN_REQUESTED = "sign-in-requested";

export const oneCallAtATime = <T>(pFn: (...params:any[]) => Promise<T>) => {
    let pCurrent: Promise<T> | null = null;
    return (...params:any[]) => {
        if (pCurrent !== null) return pCurrent;
        pCurrent = pFn(...params)
            .then(success => {
                pCurrent = null;
                return success;
            })
            .catch(error => {
                pCurrent = null;
                return error;
            });
        return pCurrent;
    }
}

const defaultLogOutHandler = () => {
    console.warn("This is the default logOutHandler. No 'logOutHandler' was specified");
}

/**
 * 
 * @param axiosInstance 
 * @param options 
 */
export const authApp = ({
    accessTokenRepo = new SessionStorage("__t_access"),
    refreshTokenRepo = new LocalStorage("__t_refresh"),
    logOutHandler = defaultLogOutHandler,
    accessTokenGenerator,
    refreshTokenExpiry = null,
}: SimplyAuthOptions) => {

    const authApi = axios.create();

    // token caches
    let accessTokenCache = new ValueCache(accessTokenRepo);
    let refreshTokenCache = refreshTokenRepo === undefined ? null : new ValueCache(refreshTokenRepo);

    const logOut = () => {
        refreshTokenCache?.drop();
        logOutHandler();
    };

    const login = (tokens: AccessTokenResponse) => {
        accessTokenCache.write(tokens.accessToken, tokens.accessTokenExpiry);
        refreshTokenCache?.write(tokens.refreshToken, refreshTokenExpiry);
    }

    const newAccessTokenSaga = oneCallAtATime((): Promise<string> => {
        // Bad access token, drop from cache
        accessTokenCache.drop();
        // request refresh token if supported
        if (refreshTokenCache !== null) {
            const refreshTokenValue = refreshTokenCache.read();
            // ensure refresh token is there
            if (refreshTokenValue !== null && accessTokenGenerator) {
                // issue request for new token pair
                return accessTokenGenerator(authApi, refreshTokenValue)
                    .then(newTokens => {
                        login(newTokens);
                        console.log(newTokens);
                        return newTokens.accessToken;
                    })
                    .catch(err => {
                        return Promise.reject(err);
                        // could not obtain a refresh token, we need sign in
                        // logOut();
                        // return SIGNIN_REQUESTED;
                    });
            }
        }
        // no refresh token value, we need sign in
        logOut();
        return Promise.reject(SIGNIN_REQUESTED);
    });

    const addAxiosInterceptors = (axiosInstance: AxiosInstance) => {

        axiosInstance.interceptors.request.use((req: AxiosRequestConfig) => {
            // append access token if available
            const accessTokenValue = accessTokenCache.read();
            return accessTokenValue !== null
                ? { ...req, headers: { ...req.headers, "Authorization": `Bearer ${accessTokenValue}` }}
                : req;
        });
    
        axiosInstance.interceptors.response.use(
            (response: AxiosResponse) => response, 
            (error: AxiosError) => {
                
                return (error.response && error.response.status === 401) 
                    ? newAccessTokenSaga().then(_ => axiosInstance(error.config))
                    : Promise.reject(error);
            });
    }


    
    return { addAxiosInterceptors, login, logOut };
}


        
