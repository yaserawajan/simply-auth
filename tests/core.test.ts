import axios, { AxiosInstance } from 'axios';
import { addAxiosInterceptors, authConfig, ERR_SIGNIN_REQUESTED, MemoryRepo, ValueCache } from "../src";
import nock from "nock";


axios.defaults.adapter = require('axios/lib/adapters/http')

let seq = 0;

nock.restore();

nock("http://www.google.com")
    .persist()
    .post("/new_tokens")
    .reply(function(uri, request_body) {
        
        if (request_body === `r-${seq.toString()}`) {
            ++seq;
            return [200, {
                accessToken: `a-${seq.toString()}`,
                refreshToken: `r-${seq.toString()}`,
                accessTokenExpiry: 600
            }];
        }
        else {
            return [401, {}];
        }
    })
    .get("/public_api")
    .reply(function () {
        return Promise.resolve([200, this.req.headers["authorization"]]);
    })
    .get("/protected_api")
    .reply(function () {
        const accessToken = this.req.headers["authorization"];
        if (accessToken && accessToken.split(' ')[1] === `a-${seq.toString()}`) return [200, accessToken.split(" ")[1]];
        else return ([401, { }]);
    });

if (!nock.isActive()) nock.activate();



const installAuthApp = (axiosInstance: AxiosInstance, accessTokenCache: ValueCache, refreshTokenCache: ValueCache, logOutHandler?: () => void) => {
    const auth = authConfig({
        accessTokenCache,
        refreshTokenCache,
        logOutHandler: logOutHandler ?? (() => {}),
        accessTokenGenerator: (axios, refreshToken) => {
            return axios({
                method: "POST",
                url: "http://www.google.com/new_tokens",
                data: refreshToken
            }).then(res => res.data).catch(err => {
                if (err.response && err.response.status === 401) {
                    return Promise.resolve(null);
                }
                else {
                    return Promise.reject(err);
                }
            });
        }
    });

    addAxiosInterceptors(axiosInstance, auth);
}

beforeEach(function (done) {
    seq = 0;
    done();
});

it("does not pass an access token when not available and not needed", async () => {
    const a = axios.create();
    installAuthApp(a, new MemoryRepo(), new MemoryRepo("ref789"));
    const response = await a({
        url: "http://www.google.com/public_api",
    });
    expect(response.data).toStrictEqual("");
});

it("does not pass an access token until needed", async () => {
    const a = axios.create();
    installAuthApp(a, new MemoryRepo("acc456"), new MemoryRepo("ref789"));
    const response = await a({
        url: "http://www.google.com/public_api",
    });
    expect(response.data).toStrictEqual("");
});

it("requests a new access token if API is protected and no token is available", async () => {
    const a = axios.create();
    const accessTokenRepo = new MemoryRepo();
    const refreshTokenRepo = new MemoryRepo("r-0");
    installAuthApp(a, accessTokenRepo, refreshTokenRepo);

    let response = await a({
        url: "http://www.google.com/protected_api",
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual("a-1");

    response = await a({
        url: "http://www.google.com/protected_api",
    });

    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual("a-1");
});

it("logs out if API is protected and new access token request is denied", async () => {
    const a = axios.create();
    const accessTokenRepo = new MemoryRepo();
    const refreshTokenRepo = new MemoryRepo("invalid_token");
    const logoutHandler = jest.fn();
    installAuthApp(a, accessTokenRepo, refreshTokenRepo, logoutHandler);

    try {
        const response = await a({
            url: "http://www.google.com/protected_api",
        });
    }
    catch (err) {
        expect(err).toBe(ERR_SIGNIN_REQUESTED);
    }
    
    expect(logoutHandler).toHaveBeenCalled();
});
