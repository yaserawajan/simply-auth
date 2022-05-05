import React, { useContext, useEffect, useMemo, useState } from "react";
import { isLoggedInCallback, loginCallback, logoutCallback } from "./api";
import { AuthApi, AuthConfig } from "./types";

const noOp = () => { }
const authApiContext = React.createContext<AuthApi>({ login: noOp, logout: noOp, isLoggedIn: false });

export const AuthApiProvider:React.FC<{ authApp: AuthConfig, children?: React.ReactNode; }> = ({ authApp, children }) => {

    const [isLoggedIn, setLoggedIn] = useState<boolean | null>(null);

    const api = useMemo(() => ({
        login: loginCallback(authApp),
        logout: logoutCallback(authApp),
        isLoggedIn
    }), [isLoggedIn, ...Object.values(authApp)]);

    useEffect(() => {
        isLoggedInCallback(authApp)()
            .then(value => {
                setLoggedIn(value);
            });
    }, [...Object.values(authApp)]);

    return (
        isLoggedIn !== null
            ? <authApiContext.Provider value={api as AuthApi}>{children}</authApiContext.Provider>
            : null
    );
} 

export const useAuthApi = ():AuthApi => {
    return useContext(authApiContext);
}