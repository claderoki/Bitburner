import type {NS, Server} from '../index';
import { ServerTraverser } from './helper';

export async function main(ns: NS) {
    let servers = new ServerTraverser(ns).traverse((s) => s.backdoorInstalled);
    ns.tprint(servers);
    
}