import type {NS, Server} from '../index';
import { ServerTraverser, hashCode, isHackable } from './helper';

function minutes(minutes: number) {
    return minutes * 60000;
}

export async function main(ns: NS) {
    let manager = new ControllerManager(ns);
    while (true) {
        manager.poll();
        await ns.sleep(minutes(30));
    }
}

class ControllerManager {
    distributor: ControllerDistributor;
    ns: NS;

    constructor(ns: NS) {
        this.ns = ns;
        this.distributor = new ControllerDistributor();
    }

    poll() {
        let level = this.ns.getHackingLevel();
        let hackableServers = new ServerTraverser(this.ns)
            .traverse((s) => isHackable(this.ns, s, level))
            .sort(function(a,b){return b.moneyAvailable-a.moneyAvailable});

        for (let server of this.distributor.distribute(this.ns)) {
            if (hackableServers.length === 0) {
                this.ns.tprint('Ran out of hackable servers.');
                break;
            }
            
            this.ns.killall(server.hostname);
            let serverToHack = hackableServers.pop();
            this.ns.tprint('Running controller on ' + server.hostname + " (hacking " + serverToHack.hostname + ")");
            this.ns.exec(this.distributor.CONTROLLER_FILE, server.hostname, 1, serverToHack.hostname);
        }
        if (hackableServers.length === 0) {
            this.ns.tprint('Done distributing, servers still remaining: ' + hackableServers.join(','));
        }

    }
}

class ControllerDistributor {
    FILES_TO_INJECT = [
        "controller.js", "hack.js",
        "crack.js", "grow.js",
        "helper.js", "weaken.js",
    ];
    CONTROLLER_FILE = this.FILES_TO_INJECT[0];
    
    isEligbleForDistribution(ns: NS, server: Server, ramNeeded: number, hash: string) {
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
        
        let serverHash = this.getHash(ns, server);
        if (serverHash === null) {
            ns.tprint(server.hostname + ' no controller yet, will distribute.');
            return true;
        } else if (serverHash !== hash) {
            ns.tprint(server.hostname + ' has an out of date controller, will update.');
            return true;
        }
    
        if (ns.scriptRunning(this.CONTROLLER_FILE, server.hostname)) {
            return false;
        }
        return true;
    }
    
    getHash(ns: NS, server: Server) {
        let hashFiles = ns.ls(server.hostname, '.hash.txt');
        if (hashFiles.length === 0) {
            return null;
        }
        let hashFile = hashFiles[0];
        return hashFile.substring(0, hashFile.length - '.hash.txt'.length);
    }
    
    distributeTo(ns: NS, server: Server, hash: string) {
        let serverHash = this.getHash(ns, server);
        if (serverHash !== hash) {
            for (let file of this.FILES_TO_INJECT) {
                ns.rm(file, server.hostname);
            }
            ns.rm(serverHash + '.hash.txt', server.hostname);
            ns.scp(this.FILES_TO_INJECT, server.hostname, ns.getHostname());	
            ns.write(hash + '.hash.txt');
            ns.scp(hash + '.hash.txt', server.hostname, ns.getHostname());	
        }
    }
    
    distribute(ns: NS): Server[] {
        let ramNeeded = ns.getScriptRam(this.FILES_TO_INJECT[0]);
        let currentHash = hashCode(this.FILES_TO_INJECT.map((f) => ns.read(f)).join(',')).toString();
    
        let servers = new ServerTraverser(ns)
            .traverse((s) => this.isEligbleForDistribution(ns, s, ramNeeded, currentHash))
            ;
        if (servers.length === 0) {
            return [];
        }
    
        for (let server of servers) {
            this.distributeTo(ns, server, currentHash);
        }
        return servers;
    }
}