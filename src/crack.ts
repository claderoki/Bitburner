import type {NS} from '../index';
import { ServerTraverser, crack, isCrackable } from './helper';


export async function main(ns: NS) {
    let level = ns.getHackingLevel();
    let servers = new ServerTraverser(ns).traverse((s) => isCrackable(ns, s, level));
    for (let server of servers) {
        ns.tprint('Cracking ' +server.hostname + "...");
        crack(ns, server);
    }
}