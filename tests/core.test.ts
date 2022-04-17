import axios, { AxiosInstance } from 'axios';
import { authApp, MemoryRepo, ValueRepo } from "../src/core";
import nock from "nock";



const installAuthApp = (axiosInstance: AxiosInstance, accessTokenRepo: ValueRepo, refreshTokenRepo: ValueRepo) => {
    const { login, logOut, addAxiosInterceptors } = authApp({
        accessTokenRepo,
        refreshTokenRepo,
        accessTokenGenerator: (axios, refreshToken) => {
            return axios({
                method: "POST",
                url: "http://www.google.com/new_tokens",
                data: refreshToken
            }).then(res => res.data);
        }
    });

    addAxiosInterceptors(axiosInstance);
}

beforeEach(function (done) {

    axios.defaults.adapter = require('axios/lib/adapters/http')

    let seq = 0;

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

it("passes an access token when available", async () => {
    const a = axios.create();
    installAuthApp(a, new MemoryRepo("acc456"), new MemoryRepo("ref789"));
    const response = await a({
        url: "http://www.google.com/public_api",
    });
    expect(response.data).toStrictEqual("Bearer acc456");
});

it("requests a new access token if API is protected and no token is available", async () => {
    const a = axios.create();
    const accessTokenRepo = new MemoryRepo();
    const refreshTokenRepo = new MemoryRepo("r-0");
    installAuthApp(a, accessTokenRepo, refreshTokenRepo);

    const response = await a({
        url: "http://www.google.com/protected_api",
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual("a-1");

    
});

it("requests a new token if API is protected and invalidates old token", async () => {
    const a = axios.create();
    const accessTokenRepo = new MemoryRepo();
    const refreshTokenRepo = new MemoryRepo("r-0");
    installAuthApp(a, accessTokenRepo, refreshTokenRepo);

    const response = await a({
        url: "http://www.google.com/protected_api",
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual("a-1");

    
});
