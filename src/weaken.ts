import type {NS} from '../index';

export async function main(ns: NS) {
    await ns.weaken(ns.args[0].toString());
}