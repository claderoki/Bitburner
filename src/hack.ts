import type {NS} from '../index';

export async function main(ns: NS) {
    await ns.hack(ns.args[0].toString());
}