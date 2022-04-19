import React, { useContext } from "react";
import { isLoggedInCallback, loginCallback, logoutCallback } from "./api";
import { AuthApi, AuthApp } from "./core";

const noOp = () => { }
const authApiContext = React.createContext<AuthApi>({ login: noOp, logout: noOp, isLoggedIn: () => false });

export const AuthApiProvider:React.FC<{ authApp: AuthApp, children?: React.ReactNode; }> = ({ authApp, children }) => {

    const login = loginCallback(authApp);
    const logout = logoutCallback(authApp);
    const isLoggedIn = isLoggedInCallback(authApp);

    return (
        <authApiContext.Provider value={{ login, logout, isLoggedIn }}>
            {children}
        </authApiContext.Provider>
    )
} 

export const useAuthApi = ():AuthApi => {
    return useContext(authApiContext);
}