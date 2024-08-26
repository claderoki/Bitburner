import type {NS, Server} from '../index';
import { ServerTraverser, isCrackable } from './helper';


export async function main(ns: NS) {
    let level = ns.getHackingLevel();
    let servers = new ServerTraverser<Server>(ns, ns.scan, ns.getServer).traverse((s) => isCrackable(ns, s, level, ns.fileExists));
    for (let server of servers) {
        ns.tprint('Cracking ' +server.hostname + "...");
        crack(ns, server);
    }
}
function openPorts(ns: NS, server: Server, fileExistsCheck: (s: string) => boolean) {
    if (server.hasAdminRights) {
        return;
    }
    if (!server.ftpPortOpen && fileExistsCheck('FTPCrack.exe')) {
        ns.tprint('No ftp access yet... Running FTPCrack.exe');
        ns.ftpcrack(server.hostname);
    }
    if (!server.sshPortOpen && fileExistsCheck('BruteSSH.exe')) {
        ns.tprint('No ftp access yet... Running BruteSSH.exe');
        ns.brutessh(server.hostname);
    }
    if (!server.smtpPortOpen && fileExistsCheck('relaySMTP.exe')) {
        ns.tprint('No ftp access yet... Running relaySMTP.exe');
        ns.relaysmtp(server.hostname);
    }
    if (!server.httpPortOpen && fileExistsCheck('HTTPWorm.exe')) {
        ns.tprint('No ftp access yet... Running HTTPWorm.exe');
        ns.httpworm(server.hostname);
    }
    if (!server.sqlPortOpen && fileExistsCheck('SQLInject.exe')) {
        ns.tprint('No ftp access yet... Running SQLInject.exe');
        ns.sqlinject(server.hostname);
    }
}

export function crack(ns: NS, server: Server) {
    openPorts(ns, server, ns.fileExists);
    if (!server.hasAdminRights) {
        ns.tprint('No admin access yet... NUKE.exe');
        ns.nuke(server.hostname);     
    }
}