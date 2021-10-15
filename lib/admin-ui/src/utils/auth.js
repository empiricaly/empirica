import { writable } from "svelte/store";

const admin = writable(null);

export const currentAdmin = { subscribe: admin.subscribe };
export const setCurrentAdmin = admin.set;
