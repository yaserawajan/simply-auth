import { ValueRepo } from "./core";

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