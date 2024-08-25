import type { NS } from '../index';

export async function main(ns: NS) {
    let target = ns.args[0].toString();
    let securityThresh = ns.getServerMinSecurityLevel(target) + 5;
    let moneyThresh = ns.getServerMaxMoney(target) * 0.75;
    
    while (true) {
        while (ns.getServerSecurityLevel(target) > securityThresh) {
            await ns.weaken(target);
        }
        while (ns.getServerMoneyAvailable(target) < moneyThresh) {
            await ns.grow(target);
        }
        await ns.hack(target);
    }
}