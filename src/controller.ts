import type {NS, Server} from '../index';
import { ServerTraverser, gainAccess, isHackable } from './helper';

function findBestServerToHack(ns: NS) {
    let level = ns.getHackingLevel();
    let servers = new ServerTraverser(ns).traverse((s) => isHackable(ns, s, level));
    let sorted = Object.keys(servers).sort(function(a,b){return servers[b].moneyAvailable-servers[a].moneyAvailable});servers
    return ns.getServer(sorted[0]);
}

function* cycleServers(ns: NS): Iterator<Server> {
    let server = findBestServerToHack(ns);
    gainAccess(ns, server)

    let i = 0;
    while (true) {
        if (i % 250 === 0) {
            let new_server = findBestServerToHack(ns);
            if (server !== new_server) {
                gainAccess(ns, new_server);   
            }
            server = new_server;
        }
        yield server;
        i += 1;
    }
}

interface ScriptInfo {
    weakenThreads: number;
    weakenGrowDelay: number;
    growThreads: number;
    hackWeakenDelay: number;
    growWeakenThreads: number;
    delay: number;
    hackThreads: number;
    weakenTime: number;
}

function calculateScriptInfo(ns: NS, self: string, server: Server): ScriptInfo {
    let availableRam = ns.getServerMaxRam(self) - ns.getServerUsedRam(self);
    let hackRam = ns.getScriptRam("hack.js");
    let growRam = ns.getScriptRam("grow.js");
    let weakenRam = ns.getScriptRam("weaken.js");
    let maxHackThreads = Math.floor(availableRam / hackRam);
    let maxGrowThreads = Math.floor(availableRam / growRam);
    let maxWeakenThreads = Math.floor(availableRam / weakenRam);
    let hackThreads = Math.min(maxHackThreads, Math.floor(ns.hackAnalyzeThreads(server.hostname, ns.getServerMoneyAvailable(server.hostname) * 0.25)));
    let weakenThreads = Math.min(maxWeakenThreads, Math.ceil(ns.hackAnalyzeSecurity(hackThreads) / ns.weakenAnalyze(1)));
    let growThreads = Math.min(maxGrowThreads, Math.ceil(ns.growthAnalyze(server.hostname, 1 / (1 - 0.25))));
    let growWeakenThreads = Math.min(maxWeakenThreads, Math.ceil(ns.growthAnalyzeSecurity(growThreads) / ns.weakenAnalyze(1)));
    let hackTime = ns.getHackTime(server.hostname);
    let growTime = ns.getGrowTime(server.hostname);
    let weakenTime = ns.getWeakenTime(server.hostname);
    let delay = 200;
    let weakenGrowDelay = weakenTime - growTime + delay;
    let hackWeakenDelay = weakenTime - hackTime + delay;

    return {
        weakenThreads,
        weakenGrowDelay,
        growThreads,
        hackWeakenDelay,
        growWeakenThreads,
        delay,
        hackThreads,
        weakenTime
    };
}

export async function main(ns: NS) {
    let self = ns.getHostname();
    let generator = cycleServers(ns);
    let server, scriptInfo;
    let i = 0;
    while (true) {
        if (i % 25 == 0) {
            server = generator.next().value;
            scriptInfo = calculateScriptInfo(ns, self, server);
            ns.tprint('Hacking (new) server: ' + server.hostname);
        }

        let start = performance.now();
        ns.exec("weaken.js", self, scriptInfo.weakenThreads, server.hostname);
        await ns.sleep(scriptInfo.weakenGrowDelay);

        ns.exec("grow.js", self, scriptInfo.growThreads, server.hostname);
        await ns.sleep(scriptInfo.hackWeakenDelay);

        ns.exec("weaken.js", self, scriptInfo.growWeakenThreads, server.hostname);
        await ns.sleep(scriptInfo.delay);

        ns.exec("hack.js", self, scriptInfo.hackThreads, server.hostname);
        await ns.sleep(scriptInfo.weakenTime + scriptInfo.delay - (performance.now() - start));
        i++;
    }
}