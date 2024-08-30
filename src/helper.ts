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
        // add home here
        this.traverseRecursively(null, '.', data, predicate);
        for (let key of Object.keys(data)) {
            if (data[key] === null) {
                delete data[key];
            }
        }
        return Object.keys(data).map((k) => data[k]);
    }

    filter(predicate: (t: T) => boolean): T[] {
        return this.traverse(predicate);
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

export interface Argument {
    flag: string;
    choices?: string[];
    defaultValue: string | null;
}


export class ArgumentParser {
    arguments: {[key: string]: Argument} = {};

    addArgument(flag: string, choices: string[], defaultValue?: string): ArgumentParser {
        this.arguments[flag] = {flag, choices, defaultValue};
        return this;
    }

    addBoolArgument(flag: string, defaultValue: boolean): ArgumentParser {
        return this.addArgument(flag, ['1', '0'], defaultValue ? '1' : '0');
    }

    rawParse(ns: NS): {[key: string]: string} {
        let raw: {[key: string]: string} = {};
        for (let arg of ns.args) {
            arg = arg.toString();
            if (arg.startsWith('--')) {
                let values = arg.split('=');
                raw[values[0].substring(2)] = values[1];
            }
        }
        return raw;
    }

    private addIf(flag: string, value: string, data: {[key: string]: string}) {
        let arg = this.arguments[flag];
        if (arg.choices && arg.choices.indexOf(value) === -1) {
            if (arg.defaultValue) {
                value = arg.defaultValue;
            } else {
                throw Error(value + ' is not a valid value. Valid values: ' + arg.choices);
            }
        }
        data[flag] = value;
    }

    private showHelp(ns: NS) {
        for (let flag of Object.keys(this.arguments)) {
            let info = this.arguments[flag];
            ns.tprint('--' + flag + ', possible options: ' +  info.choices + ' default: ' + info.defaultValue);
        }
    }

    parse(ns: NS): {[key: string]: string} {
        let missing = Object.keys(this.arguments);
        let data = {};
        if (ns.args.length > 0 && ns.args[0] === '--help') {
            this.showHelp(ns);
            return null;
        }

        let raw: {[key: string]: string} = this.rawParse(ns);

        for(let flag of Object.keys(this.arguments)) {
            let argument = raw[flag];
            if (argument) {
                missing.splice(missing.indexOf(flag), 1);
                this.addIf(flag, argument, data);
            }
        }
        return data;
    }
}

export const MANAGER_FORCE_PORT = 3156;
export const MANAGER_CONFIG_PORT = 3556;

export const PORT_EMPTY = "NULL PORT DATA";