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

class HackingManager {
    ns: NS;
    target: Server;
    scriptInfo: ScriptInfo;
    previousAction: string;
    host: string;

    constructor(ns: NS, target: Server) {
        this.ns = ns;
        this.host = ns.getHostname();
        this.target = target;
        this.scriptInfo = this.calculateOptimalScriptInfo();
        this.previousAction = null;
    }

    calculateOptimalScriptInfo(): ScriptInfo {
        const hackThreads = this.getOptimalHackThreads(this.target.hostname);
        const growThreads = this.getOptimalGrowThreads(this.target.hostname);
        const weakenThreads = this.getWeakenThreadsForHack(this.target.hostname, hackThreads);
        const growWeakenThreads = this.getWeakenThreadsForGrow(this.target.hostname, growThreads);
        
        const weakenTime = this.ns.getWeakenTime(this.target.hostname);
        const growTime = this.ns.getGrowTime(this.target.hostname);
        const hackTime = this.ns.getHackTime(this.target.hostname);

        // Calculate delays
        const hackWeakenDelay = weakenTime - hackTime;
        const weakenGrowDelay = weakenTime - growTime;
        const delay = hackWeakenDelay; // Assuming delay is based on hackWeakenDelay for simplicity

        return {
            weakenThreads: weakenThreads,
            weakenGrowDelay: weakenGrowDelay,
            growThreads: growThreads,
            hackWeakenDelay: hackWeakenDelay,
            growWeakenThreads: growWeakenThreads,
            delay: delay,
            hackThreads: hackThreads,
            weakenTime: weakenTime,
        };
    }

    getOptimalHackThreads(target: string): number {
        // Implement the logic to calculate optimal hack threads
        // Example: You can use ns.hackAnalyzeThreads(target, desiredMoneyToHack) to determine the threads
        const desiredHackPercent = 0.1; // Example: Hack 10% of the money
        return Math.ceil(this.ns.hackAnalyzeThreads(target, this.ns.getServerMaxMoney(target) * desiredHackPercent));
    }

    getOptimalGrowThreads(target: string): number {
        const serverMaxMoney = this.ns.getServerMaxMoney(target);
        const currentMoney = this.ns.getServerMoneyAvailable(target);
    
        if (currentMoney >= serverMaxMoney) {
            return 0; // No need to grow if the server is already at max money
        }
    
        const growthMultiplier = serverMaxMoney / Math.max(currentMoney, 1); // Ensure currentMoney is not 0
    
        if (growthMultiplier <= 1) {
            return 0; // No need to grow if multiplier is 1 or less
        }
    
        return Math.ceil(this.ns.growthAnalyze(target, growthMultiplier) / 60);
    }

    getWeakenThreadsForHack(target: string, hackThreads: number): number {
        const securityIncrease = this.ns.hackAnalyzeSecurity(hackThreads);
        return Math.ceil(securityIncrease / this.ns.weakenAnalyze(1));
    }

    getWeakenThreadsForGrow(target: string, growThreads: number): number {
        const securityIncrease = this.ns.growthAnalyzeSecurity(growThreads);
        return Math.ceil(securityIncrease / this.ns.weakenAnalyze(1));
    }

    execute(scriptName: string, threads: number) {
        if (threads === 0) {
            this.ns.tprint(`No need to run ${scriptName} (0 threads)`)
            return;
        }
        const availableRam = this.ns.getServerMaxRam(this.host) - this.ns.getServerUsedRam(this.host);
        const ramCost = this.ns.getScriptRam(scriptName);
        const maxThreads = Math.floor(availableRam / ramCost);

        if (threads > maxThreads) {
            this.ns.tprint(`${threads} is greater than ${maxThreads} (max possible threads for ${scriptName})`);
            threads = maxThreads;
        }

        if (threads < 0) {
            this.ns.tprint(`No need to run ${scriptName} (0 threads).2`)
            return;
        }

        let pid = this.ns.exec(scriptName, this.host, threads, this.target.hostname);
        if (pid === 0) {
            throw Error('PID 0 for ' + scriptName);
        }
    }

    weaken() {
        let threads = this.scriptInfo.weakenThreads;
        if (this.previousAction === 'grow.js') {
            threads = this.scriptInfo.growWeakenThreads;
        }

        this.execute('weaken.js', threads);
    }
    
    grow() {
        this.execute("grow.js", this.scriptInfo.growThreads);
    }
    
    hack() {
        const remainingRam =  this.ns.getServerMaxRam(this.host) - this.ns.getServerUsedRam(this.host);
        const additionalHackThreads = Math.floor(remainingRam / this.ns.getScriptRam("hack.js"));

        if (additionalHackThreads > 0) {
            this.scriptInfo.hackThreads += additionalHackThreads;
        }

        this.execute("hack.js", this.scriptInfo.hackThreads);
    }
    
    async cycle() {
        this.scriptInfo = this.calculateOptimalScriptInfo();
        let start = performance.now();

        this.weaken();
        await this.ns.sleep(this.scriptInfo.weakenGrowDelay);
        this.grow();
        await this.ns.sleep(this.scriptInfo.hackWeakenDelay);
        this.weaken();
        this.hack();
        
        const timeTaken = performance.now() - start;
        await this.ns.sleep(this.scriptInfo.weakenTime - timeTaken);
    }

}

export async function main(ns: NS) {
    const server = ns.getServer(ns.args[0].toString());
    const self = ns.getHostname();
    if (self === 'home') {
        ns.tprint('Hacking ' + server.hostname + ', €' + server.moneyAvailable + ' available');
    }
    let manager = new HackingManager(ns, server);
    manager.target = server;

    while (true) {
        await manager.cycle();
    }
}
