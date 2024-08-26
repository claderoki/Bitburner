import type {NS, Server} from '../index';
import { ServerTraverser, hashCode, isHackable } from './helper';


class ArgParser {
    ns: NS;

    constructor(ns: NS) {
        this.ns = ns;
    }

    optional<T>(index: number, parser: (s: string | number | boolean) => T): T | null {
        if (index >= this.ns.args.length) {
            return null;
        }
        return parser(this.ns.args[index]);
    }
}

export async function main(ns: NS) {
    let parser = new ArgParser(ns);
    let force = parser.optional(0, (s) => s.toString() === 'force');
    let manager = new ControllerManager(ns, force);
    manager.poll();
}

class ControllerManager {
    distributor: ControllerDistributor;
    ns: NS;
    upgraded: Server[]
    force: boolean;

    constructor(ns: NS, force: boolean = false) {
        this.ns = ns;
        this.upgraded = [];
        this.distributor = new ControllerDistributor(ns);
        this.force = force;
        this.distributor.force = force;
    }

    distributePoll(servers: Server[]) {
        let level = this.ns.getHackingLevel();
        let ns = this.ns;
        let current = ns.getRunningScript('controller.js');
        let target: string | null = null;
        if (current) {
            target = current.args[0].toString();
        }    

        let hackableServers = servers
            .filter((s) => isHackable(s, level) && s.hostname !== target)
            .sort((a,b) => calculateProfitPerMs(ns, a)-calculateProfitPerMs(ns, b));

        let distributed = this.distributor.distribute();
        distributed.push(...this.upgraded);

        for (let server of distributed) {
            if (hackableServers.length === 0) {
                this.ns.tprint('Ran out of hackable servers.');
                break;
            }
            
            let threads = 1;
            if (true) {
                threads = maxPossibleThreads(this.ns, this.distributor.CONTROLLER_FILE, server.hostname);
            }
            if (threads === 0) {
                continue;
            }

            this.ns.killall(server.hostname);
            let serverToHack = hackableServers.pop();
            this.ns.tprint('Running controller on ' + server.hostname + " (hacking " + serverToHack.hostname + ")");
            this.ns.exec(this.distributor.CONTROLLER_FILE, server.hostname, threads, serverToHack.hostname);
        }
        if (hackableServers.length > 0) {
            this.ns.tprint('Done distributing, servers still remaining: ' + hackableServers.map((s) => s.hostname).join(','));
        }
        this.upgraded = [];
    }

    purchasePoll(servers: Server[]) {
        while (true) {
            let hostname = this.ns.purchaseServer('home', 2);
            if (hostname === '') {
                return;
            }
            servers.push(this.ns.getServer(hostname));
        }
    }

    upgradePoll(servers: Server[]) {
        while (true) {
            for (let server of servers.filter((s) => s.purchasedByPlayer)) {
                if (server.hostname === 'home') {
                    continue;
                }
                if (this.ns.upgradePurchasedServer(server.hostname, server.maxRam * 2)) {
                    server.maxRam = server.maxRam * 2;
                    this.ns.tprint('Upgraded ' + server.hostname + ' (' + server.maxRam + ' -> ' + server.maxRam * 2 + ')');
                    this.upgraded.push(server);
                } else {
                    return;
                }
            }
        }
    }

    poll() {
        let servers = new ServerTraverser<Server>(this.ns, this.ns.scan, this.ns.getServer).all();
        this.purchasePoll(servers);
        this.upgradePoll(servers);

        this.distributePoll(servers);
    }
}

class ControllerDistributor {
    ns: NS;
    force: boolean = false;

    constructor(ns: NS) {
        this.ns = ns;
    }

    FILES_TO_INJECT = [
        "controller.js",
        // "hack.js",
        // "crack.js",
        // "grow.js",
        // "helper.js",
        // "weaken.js",
    ];
    CONTROLLER_FILE = this.FILES_TO_INJECT[0];
    
    isEligbleForDistribution(server: Server, ramNeeded: number, hash: string) {
        if (server.hostname === 'home') {
            return false;
        }
        if (!server.backdoorInstalled && !server.purchasedByPlayer) {
            return false;
        }
        let availableRam = server.maxRam - server.ramUsed;
        if (availableRam < ramNeeded) {
            return false;
        }
        if (this.force) {
            return true;
        }
        
        let serverHash = this.getHash(server);
        if (serverHash === null) {
            this.ns.tprint(server.hostname + ' no controller yet, will distribute.');
            return true;
        } else if (serverHash !== hash) {
            this.ns.tprint(server.hostname + ' has an out of date controller, will update.');
            return true;
        }
    
        if (this.ns.scriptRunning(this.CONTROLLER_FILE, server.hostname)) {
            return false;
        }
        return true;
    }
    
    getHash(server: Server) {
        let hashFiles = this.ns.ls(server.hostname, '.hash.txt');
        if (hashFiles.length === 0) {
            return null;
        }
        let hashFile = hashFiles[0];
        return hashFile.substring(0, hashFile.length - '.hash.txt'.length);
    }
    
    distributeTo(server: Server, hash: string) {
        // never delete or mess with files on home.
        if (server.hostname === 'home') {
            return;
        }

        let serverHash = this.getHash(server);
        if (serverHash !== hash) {
            for (let file of this.FILES_TO_INJECT) {
                this.ns.rm(file, server.hostname);
            }
            this.ns.rm(serverHash + '.hash.txt', server.hostname);
            this.ns.scp(this.FILES_TO_INJECT, server.hostname, this.ns.getHostname());	
            this.ns.write(hash + '.hash.txt');
            this.ns.scp(hash + '.hash.txt', server.hostname, this.ns.getHostname());	
        }
    }
    
    distribute(): Server[] {
        let ramNeeded = this.ns.getScriptRam(this.FILES_TO_INJECT[0]);
        let currentHash = hashCode(this.FILES_TO_INJECT.map((f) => this.ns.read(f)).join(',')).toString();
    
        let servers = new ServerTraverser<Server>(this.ns, this.ns.scan, this.ns.getServer)
            .traverse((s) => this.isEligbleForDistribution(s, ramNeeded, currentHash))
            ;
        if (servers.length === 0) {
            return [];
        }
    
        for (let server of servers) {
            this.distributeTo(server, currentHash);
        }
        return servers;
    }
}

export function calculateProfitPerMs(ns: NS, server: Server): number {
    if (server.moneyMax <= 0) {
        return 0;
    }

    const hackFraction = 0.1;
    const hackThreads = Math.ceil(ns.hackAnalyzeThreads(server.hostname, hackFraction * server.moneyAvailable));

    if (hackThreads <= 0) {
        return 0;
    }

    const hackedFraction = ns.hackAnalyze(server.hostname) * hackThreads;
    const hackedMoney = hackedFraction * server.moneyAvailable;
    const newMoney = server.moneyAvailable - hackedMoney;
    const growthMultiplier = server.moneyMax / newMoney;

    if (growthMultiplier < 1) {
        return 0;
    }
    const cycleTime = Math.max(ns.getHackTime(server.hostname), ns.getGrowTime(server.hostname), ns.getWeakenTime(server.hostname));
    return hackedMoney / cycleTime;
}

export function maxPossibleThreads(ns: NS, scriptName: string, host: string): number {
    const availableRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
    let ramCost = ns.getScriptRam(scriptName);
    return Math.floor(availableRam / ramCost);
}
