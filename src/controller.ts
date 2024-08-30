import type { NS } from '../index';
import { ArgumentParser } from './helper';

const parser = new ArgumentParser()
    .addArgument('onlyAction', ['hack', 'grow', 'weaken'], null);

export async function main(ns: NS) {
    let args = parser.parse(ns);
    if (args == null) return;

    ns.tprint(args);

    let target = ns.args[0].toString();
    let securityThresh = ns.getServerMinSecurityLevel(target) + 5;
    let moneyThresh = ns.getServerMaxMoney(target) * 0.90;
    
    while (true) {
        if (args.onlyAction === null) {
            if (ns.getServerSecurityLevel(target) > securityThresh) {
                await ns.weaken(target);
            } else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
                await ns.grow(target);
            } else {
                await ns.hack(target);
            }
        } else {
            switch (args.onlyAction) {
                case 'hack':
                    await ns.hack(target);
                    break;
                case 'grow':
                    await ns.grow(target);
                    break;
                case 'weaken':
                    await ns.weaken(target);
                    break;
        
            }
        }

    }
}