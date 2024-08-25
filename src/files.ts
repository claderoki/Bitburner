import type {NS} from '../index';
import { ServerTraverser } from './helper';


export async function main(ns: NS) {
    let servers = new ServerTraverser(ns).traverse((s) => s.backdoorInstalled);
    for (let server of servers) {
        for (let file of ns.ls(server.hostname)) {
            if (file.endsWith('js')) {
                continue;
            }
            if (file.indexOf('.hash') !== -1) {
                continue;
            }
            ns.scp(file, ns.getHostname(), server.hostname);
        }
    }
}