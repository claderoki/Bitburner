import type {NS, Server} from '../index';

export class ServerTraverser {
    ns: NS;

    constructor(ns: NS) {
        this.ns = ns;
    }

    private traverseRecursively(host: string | null, data: {[key: string]: Server | null}, predicate: (server: Server) => boolean) {
        let neighbors = host ? this.ns.scan(host) : this.ns.scan();
        for (let i = 0; i < neighbors.length; i++) {
            let neighbor: string = neighbors[i];
            if (data[neighbor] !== undefined) {
                continue;
            }
            let server = this.ns.getServer(neighbor);
            if (predicate(server)) {
                data[neighbor] = server;
            } else {
                data[neighbor] = null;
            }
            this.traverseRecursively(neighbor, data, predicate);
        }
    }

    traverse(predicate: (server: Server) => boolean): {[key: string]: Server} {
        let data: {[key: string]: Server | null} = {};
        this.traverseRecursively(null, data, predicate);
        for (let key of Object.keys(data)) {
            if (data[key] === null) {
                delete data[key];
            }
        }
        return data;
    }
}

export function isHackable(ns: NS, server: Server, hackingLevel: number) {
    if (server.purchasedByPlayer || hackingLevel < server.requiredHackingSkill) {
        return false;
    }
    if (server.hasAdminRights) {
        return true;
    }

    let openable = 0;
    if (!server.ftpPortOpen && ns.fileExists('FTPCrack.exe')) {
        openable++;
    }
    if (!server.sshPortOpen && ns.fileExists('BruteSSH.exe')) {
        openable++;
    }
    if (!server.smtpPortOpen && ns.fileExists('relaySMTP.exe')) {
        openable++;
    }
    if (!server.httpPortOpen && ns.fileExists('HTTPWorm.exe')) {
        openable++;
    }
    if (!server.sqlPortOpen && ns.fileExists('SQLInject.exe')) {
        openable++;
    }
    return openable >= server.numOpenPortsRequired;
}


function openPorts(ns: NS, server: Server) {
    if (server.hasAdminRights) {
        return;
    }
    if (!server.ftpPortOpen && ns.fileExists('FTPCrack.exe')) {
        ns.tprint('No ftp access yet... Running FTPCrack.exe');
        ns.ftpcrack(server.hostname);
    }
    if (!server.sshPortOpen && ns.fileExists('BruteSSH.exe')) {
        ns.tprint('No ftp access yet... Running BruteSSH.exe');
        ns.brutessh(server.hostname);
    }
    if (!server.smtpPortOpen && ns.fileExists('relaySMTP.exe')) {
        ns.tprint('No ftp access yet... Running relaySMTP.exe');
        ns.relaysmtp(server.hostname);
    }
    if (!server.httpPortOpen && ns.fileExists('HTTPWorm.exe')) {
        ns.tprint('No ftp access yet... Running HTTPWorm.exe');
        ns.httpworm(server.hostname);
    }
    if (!server.sqlPortOpen && ns.fileExists('SQLInject.exe')) {
        ns.tprint('No ftp access yet... Running SQLInject.exe');
        ns.sqlinject(server.hostname);
    }
}

export function gainAccess(ns: NS, server: Server) {
    openPorts(ns, server);
    if (!server.hasAdminRights) {
        ns.tprint('No admin access yet... NUKE.exe');
        ns.nuke(server.hostname);     
    }
}
