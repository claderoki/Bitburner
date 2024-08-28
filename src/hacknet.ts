import type { NS } from '../index';


function upgrade(ns : NS, index: number) {
    while (ns.hacknet.upgradeLevel(index)) {}
    while (ns.hacknet.upgradeCore(index)) {}
    while (ns.hacknet.upgradeRam(index)) {}
}

export async function main(ns: NS) {
    while (ns.hacknet.purchaseNode() !== -1) {}
    for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        upgrade(ns, i);
    }
}