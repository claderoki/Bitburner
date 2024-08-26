import type {NS, Server} from '../index';

export class ServerTraverser<T> {
    ns: NS;
    paths: {[key: string]: string};
    scanMethod: (h?: string) => string[];
    mapper: (s: string) => T;

    constructor(ns: NS, 
        scanMethod: (h?: string) => string[],
        mapper: (s: string) => T) {
        this.ns = ns;
        this.paths = {};
        this.scanMethod = scanMethod;
        this.mapper = mapper;
    }

    private traverseRecursively(
        host: string | null,
        path: string,
        data: {[key: string]: T | null},
        predicate: (s: T) => boolean) {
        let neighbors = host ? this.scanMethod(host) : this.scanMethod();
        this.paths[host] = path;
        if (path !== '.') {
            path += '.';
        }

        for (let i = 0; i < neighbors.length; i++) {
            let neighbor: string = neighbors[i];
            if (data[neighbor] !== undefined || neighbor === 'home') {
                continue;
            }
            let mapped = this.mapper(neighbor);

            if (predicate(mapped)) {
                data[neighbor] = mapped;
            } else {
                data[neighbor] = null;
            }
            this.traverseRecursively(neighbor, path+neighbor, data, predicate);
        }
    }

    traverse(predicate: (t: T) => boolean): T[] {
        let data: {[key: string]: T | null} = {};
        this.traverseRecursively(null, '.', data, predicate);
        for (let key of Object.keys(data)) {
            if (data[key] === null) {
                delete data[key];
            }
        }
        return Object.keys(data).map((k) => data[k]);
    }

    all(): T[] {
        return this.traverse((_) => true);
    }
}

export function isHackable(server: Server, hackingLevel: number) {
    if (server.purchasedByPlayer || hackingLevel < server.requiredHackingSkill) {
        return false;
    }
    return server.hasAdminRights;
}

export function isCrackable(ns: NS, server: Server, hackingLevel: number, fileExistsCheck: (s: string) => boolean) {
    if (server.purchasedByPlayer || hackingLevel < server.requiredHackingSkill) {
        return false;
    }
    if (server.hasAdminRights) {
        return false;
    }
    let openable = 0;
    if (!server.ftpPortOpen && fileExistsCheck('FTPCrack.exe')) {
        openable++;
    }
    if (!server.sshPortOpen && fileExistsCheck('BruteSSH.exe')) {
        openable++;
    }
    if (!server.smtpPortOpen && fileExistsCheck('relaySMTP.exe')) {
        openable++;
    }
    if (!server.httpPortOpen && fileExistsCheck('HTTPWorm.exe')) {
        openable++;
    }
    if (!server.sqlPortOpen && fileExistsCheck('SQLInject.exe')) {
        openable++;
    }
    return openable >= server.numOpenPortsRequired;
}


export function numberWithCommas(x: number) {
    var parts = x.toString().split(".");
    parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,".");
    return parts.join(".");
}

export function hashCode(value: string) {
    var hash = 0, i, chr;
    if (value.length === 0) return hash;
    for (i = 0; i < value.length; i++) {
      chr = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return Math.abs(hash);
}
  

function getServer() {
    
}