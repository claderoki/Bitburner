import type { NS, Server } from '../index';

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

function calculateScriptInfo(ns: NS, self: string, server: Server, availableRam: number): ScriptInfo {
    const hackRam = ns.getScriptRam("hack.js");
    const growRam = ns.getScriptRam("grow.js");
    const weakenRam = ns.getScriptRam("weaken.js");

    const maxHackThreads = Math.floor(availableRam / hackRam);
    const maxGrowThreads = Math.floor(availableRam / growRam);
    const maxWeakenThreads = Math.floor(availableRam / weakenRam);

    const hackThreads = Math.min(maxHackThreads, Math.floor(ns.hackAnalyzeThreads(server.hostname, server.moneyAvailable * 0.25)));
    const weakenThreads = Math.min(maxWeakenThreads, Math.ceil(ns.hackAnalyzeSecurity(hackThreads) / ns.weakenAnalyze(1)));
    const growThreads = Math.min(maxGrowThreads, Math.ceil(ns.growthAnalyze(server.hostname, 1 / (1 - 0.25))));
    const growWeakenThreads = Math.min(maxWeakenThreads, Math.ceil(ns.growthAnalyzeSecurity(growThreads) / ns.weakenAnalyze(1)));

    const hackTime = ns.getHackTime(server.hostname);
    const growTime = ns.getGrowTime(server.hostname);
    const weakenTime = ns.getWeakenTime(server.hostname);

    const delay = 200;
    const weakenGrowDelay = weakenTime - growTime + delay;
    const hackWeakenDelay = weakenTime - hackTime + delay;

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

function anyZero(scriptInfo: ScriptInfo): boolean {
    return scriptInfo.growThreads === 0 || 
           scriptInfo.growWeakenThreads === 0 || 
           scriptInfo.hackThreads === 0 || 
           scriptInfo.weakenThreads === 0;
}

export async function main(ns: NS): Promise<void> {
    const server = ns.getServer(ns.args[0].toString());
    const self = ns.getHostname();

    while (true) {
        const availableRam = ns.getServerMaxRam(self) - ns.getServerUsedRam(self);
        const scriptInfo = calculateScriptInfo(ns, self, server, availableRam);

        if (anyZero(scriptInfo)) {
            ns.tprint('Cannot continue :( some threads were 0.');
            return;
        }

        let multiplier = 1;
        ns.tprint(`Hacking server: ${server.hostname}`);

        let start = performance.now();

        ns.exec("weaken.js", self, scriptInfo.weakenThreads * multiplier, server.hostname);
        await ns.sleep(scriptInfo.weakenGrowDelay);

        ns.exec("grow.js", self, scriptInfo.growThreads * multiplier, server.hostname);
        await ns.sleep(scriptInfo.hackWeakenDelay);

        ns.exec("weaken.js", self, scriptInfo.growWeakenThreads * multiplier, server.hostname);
        await ns.sleep(scriptInfo.delay);

        ns.exec("hack.js", self, scriptInfo.hackThreads * multiplier, server.hostname);

        const timeTaken = performance.now() - start;
        await ns.sleep(scriptInfo.weakenTime + scriptInfo.delay - timeTaken);
    }
}
