# simply-auth
A library that extends Axios to offer seamless authentication integration into API's

## Installation
Via npm or yarn

```
npm install --save simply-auth
```

## Usage

Following is the simplest usage:

```ts
import { applyAuth } from "simply-auth";


// the API instance you're using or the default one
const myAxiosInstance = axios.create();

// function to obtain an access token from a refresh token
const accessTokenGenerator = (axios: AxiosInstance, refreshToken: string) => {
    // FILL IN THE BLANKS
    // const req = { } // ... request for a new token pair
    // // use the Axios instance passed as an argument
    // return axios(req).then(res => ({
    //     accessToken: "...",
    //     refreshToken: "...",
    //     accessTokenExpiry: 600 // in seconds
    // }));
}

// function to handle login invalidation (when credentials are needed)
const logOutHandler = () => {
    // example
    // location.reload();
    // ...
}

// appends required interceptors to axios
applyAuth(myAxiosInstance, { accessTokenGenerator, logOutHandler });
 

```