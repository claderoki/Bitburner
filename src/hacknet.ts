import type { NS, NodeStats } from '../index';

function upgrade(ns : NS, index: number): boolean {
    let upgraded = 0;
    while (ns.hacknet.upgradeLevel(index)) {
        upgraded++;
    }
    while (ns.hacknet.upgradeCore(index)) {
        upgraded++;
    }
    while (ns.hacknet.upgradeRam(index)) {
        upgraded++;
    }
    return upgraded > 0;
}

function isUpgraded(stats: NodeStats) {
    return stats.cores === 8 && stats.level === 200 && stats.ram === 64
}

export async function main(ns: NS) {
    while (true) {
        let nodes = ns.hacknet.numNodes();
        while (ns.hacknet.purchaseNode() !== -1) {
            ns.tprint('Purchased node ' + nodes)
            nodes++;
        }
        // let notFullyUpgradedNodes = Array.from(Array(nodes).keys()).filter((i) => !isUpgraded(ns.hacknet.getNodeStats(i)));

        for (let i = 0; i < ns.hacknet.numNodes(); i++) {
            if (upgrade(ns, i)) {
                ns.tprint('Upgraded node ' + i);
            }
        }

        await ns.sleep(5000);
    }
}