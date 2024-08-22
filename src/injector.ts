import type {NS} from '../index';
import { ServerTraverser } from './helper';

const FILES_TO_INJECT = [
    "controller.js",
    "hack.js",
    "grow.js",
    "helper.js",
    "weaken.js",
];

export async function main(ns: NS) {
    let ramNeeded = ns.getScriptRam(FILES_TO_INJECT[0]);

    let servers = new ServerTraverser(ns).traverse((s) => 
        s.backdoorInstalled &&
        !ns.scriptRunning(FILES_TO_INJECT[0], s.hostname) &&
        ns.getServerMaxRam(s.hostname) - ns.getServerUsedRam(s.hostname) > ramNeeded
    );
    let server = servers[Object.keys(servers)[0]];

    if (!ns.fileExists(FILES_TO_INJECT[0])) {
        ns.tprint('Copying files on ' + server.hostname + "...");
        ns.scp(FILES_TO_INJECT, server.hostname, ns.getHostname());
    }
    ns.tprint('Running controller on ' + server.hostname + "...");
    ns.exec(FILES_TO_INJECT[0], server.hostname);
}