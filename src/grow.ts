import type {NS} from '../index';

export async function main(ns: NS) {
    await ns.grow(ns.args[0].toString());
}