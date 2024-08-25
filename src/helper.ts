import type {NS, Server} from '../index';

export class ServerTraverser {
    ns: NS;
    filters: Array<(server: Server) => boolean>;

    constructor(ns: NS) {
        this.ns = ns;
        this.filters = [];
    }

    private traverseRecursively<T>(
        host: string | null,
        data: {[key: string]: T | null},
        mapper: (s: string)=>T,
        predicate: (s: T) => boolean) {
        let neighbors = host ? this.ns.scan(host) : this.ns.scan();
        for (let i = 0; i < neighbors.length; i++) {
            let neighbor: string = neighbors[i];
            if (data[neighbor] !== undefined) {
                continue;
            }
            let mapped = mapper(neighbor);

            if (predicate(mapped)) {
                data[neighbor] = mapped;
            } else {
                data[neighbor] = null;
            }
            this.traverseRecursively(neighbor, data, mapper, predicate);
        }
    }

    traverseRaw(predicate: (hostname: string) => boolean): string[] {
        let data: {[key: string]: string | null} = {};
        this.traverseRecursively(null, data, (s) => s, predicate);
        for (let key of Object.keys(data)) {
            if (data[key] === null) {
                delete data[key];
            }
        }
        return Object.keys(data).map((k) => data[k]);
    }

    traverse(predicate: (server: Server) => boolean): Server[] {
        let data: {[key: string]: Server | null} = {};
        this.traverseRecursively<Server>(null, data, (s) => this.ns.getServer(s), predicate);
        for (let key of Object.keys(data)) {
            if (data[key] === null) {
                delete data[key];
            }
        }
        return Object.keys(data).map((k) => data[k]);
    }
}

export function isHackable(ns: NS, server: Server, hackingLevel: number) {
    if (server.purchasedByPlayer || hackingLevel < server.requiredHackingSkill) {
        return false;
    }
    return server.hasAdminRights;
}

export function isCrackable(ns: NS, server: Server, hackingLevel: number) {
    if (server.purchasedByPlayer || hackingLevel < server.requiredHackingSkill) {
        return false;
    }
    if (server.hasAdminRights) {
        return false;
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

export function crack(ns: NS, server: Server) {
    openPorts(ns, server);
    if (!server.hasAdminRights) {
        ns.tprint('No admin access yet... NUKE.exe');
        ns.nuke(server.hostname);     
    }
}


export function hashCode(value: string) {
    var hash = 0,
      i, chr;
    if (value.length === 0) return hash;
    for (i = 0; i < value.length; i++) {
      chr = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  


// class CachedServer {
//     ns: NS;
//     constructor(ns: NS) {
//         this.ns = ns;
//     }

//     private _bar: boolean = false;
//     get bar(): boolean {
//         return this._bar;
//     }
//     set bar(value: boolean) {
//         this._bar = value;
//     }
// }