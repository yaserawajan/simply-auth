import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import React, { useContext } from "react";
import { AuthApp, SimplyAuthOptions, AccessTokenResponse, AuthApi } from "./core";
import { SessionStorage, LocalStorage, ValueCache } from "./repos";


const defaultLogOutHandler = () => {
    window.location.reload();
}

/**
 * 
 * @param options 
 */
 export const authApp = ({
    accessTokenRepo = new SessionStorage("__t_access"),
    refreshTokenRepo = new LocalStorage("__t_refresh"),
    logOutHandler = defaultLogOutHandler,
    accessTokenGenerator,
    refreshTokenExpiry = null,
}: SimplyAuthOptions):AuthApp => {

    // token caches
    let accessTokenCache = new ValueCache(accessTokenRepo);
    let refreshTokenCache = refreshTokenRepo === undefined ? null : new ValueCache(refreshTokenRepo);

    return {
        accessTokenCache,
        refreshTokenCache,
        refreshTokenExpiry,
        logOutHandler,
        accessTokenGenerator
    };
}

export const isLoggedInCallback = ({ accessTokenCache, refreshTokenCache }: AuthApp) => 
    () => ((accessTokenCache.read() !== null) || (
        !!refreshTokenCache && refreshTokenCache.read() !== null
    ));


export const logoutCallback = ({ refreshTokenCache, logOutHandler }: AuthApp) => {
    return () => {
        refreshTokenCache?.drop();
        logOutHandler();
    }
}

export const loginCallback = ({ accessTokenCache, refreshTokenCache, refreshTokenExpiry }: AuthApp) => {
    return (tokens: AccessTokenResponse) => {
        accessTokenCache.write(tokens.accessToken, tokens.accessTokenExpiry);
        refreshTokenCache?.write(tokens.refreshToken, refreshTokenExpiry);
    }
}

export const ERR_SIGNIN_REQUESTED = "sign-in-requested";

export const oneCallAtATime = <T>(pFn: (...params:any[]) => Promise<T>) => {
    let pCurrent: Promise<T> | null = null;
    return (...params:any[]) => {
        if (pCurrent !== null) return pCurrent;
        pCurrent = pFn(...params)
            .then(success => {
                pCurrent = null;
                return Promise.resolve(success);
            })
            .catch(error => {
                pCurrent = null;
                return Promise.reject(error);
            });
        return pCurrent;
    }
}

export const addAxiosInterceptors = (axiosInstance: AxiosInstance, authApp: AuthApp) => {

    const logOut = logoutCallback(authApp);

    const login = loginCallback(authApp);

    const authApi = axios.create();

    const newAccessTokenSaga = oneCallAtATime((): Promise<string> => {
        // Bad access token, drop from cache
        authApp.accessTokenCache.drop();
        // request refresh token if supported
        if (authApp.refreshTokenCache !== null) {
            const refreshTokenValue = authApp.refreshTokenCache.read();
            // ensure refresh token is there
            if (refreshTokenValue !== null && authApp.accessTokenGenerator) {
                // issue request for new token pair
                return authApp.accessTokenGenerator(authApi, refreshTokenValue)
                    .then(newTokens => {
                        if (newTokens !== null) {
                            login(newTokens);
                            return newTokens.accessToken;
                        }
                        else {
                            logOut();
                            return Promise.reject(ERR_SIGNIN_REQUESTED);
                        }
                    })
                    .catch(err => {
                        logOut();
                        return Promise.reject(err);
                    });
            }
        }
        // no refresh token value, we need sign in
        logOut();
        return Promise.reject(ERR_SIGNIN_REQUESTED);
    });

    axiosInstance.interceptors.request.use((req: AxiosRequestConfig) => {
        // append access token if available
        const accessTokenValue = authApp.accessTokenCache.read();
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



