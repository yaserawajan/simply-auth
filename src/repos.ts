import { ValueCache } from "./types";

export class MemoryRepo implements ValueCache {

    value: string | null

    constructor(initValue?: string) {
        this.value = initValue ?? null;
    }

    drop() {
        this.value = null;
        return Promise.resolve();
    }

    read() {
        return Promise.resolve(this.value);
    }

    write(value: string, expiryInSeconds: number | null) {
        this.value = value;
        return Promise.resolve();
    }
}

export class LocalStorage implements ValueCache {

    key: string

    constructor(key: string) {
        this.key = key;
    }

    drop() {
        localStorage.removeItem(this.key);
        return Promise.resolve();
    }

    read() {
        return Promise.resolve(localStorage.getItem(this.key));
    }

    write(value: string, expiry: number | null) {
        localStorage.setItem(this.key, value);
        return Promise.resolve();
    }
}

export class SessionStorage implements ValueCache {

    key: string

    constructor(key: string) {
        this.key = key;
    }

    drop() {
        sessionStorage.removeItem(this.key);
        return Promise.resolve();
    }

    read() {
        return Promise.resolve(sessionStorage.getItem(this.key));
    }

    write(value: string, expiryInSeconds: number | null) {
        sessionStorage.setItem(this.key, value);
        return Promise.resolve();
    }
}