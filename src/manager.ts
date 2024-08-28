import type { NS, Server } from '../index';
import { ServerTraverser, isHackable } from './helper';

let homeThreadMargin = 0.9;

function seconds(seconds: number): number {
    return seconds * 1000;
}

function minutes(minutes: number): number {
    return seconds(minutes * 60);
}

export async function main(ns: NS) {
    while (true) {
        ns.tprint('1');
        await runAndWaitFor(ns, 'crack.js');
        ns.tprint('2');
        await runAndWaitFor(ns, 'distributor.js');
        ns.tprint('3');
        let manager = new ControllerManager(ns);
        manager.poll();

        for (let i = 0; i < 60; i++) {
            if (percentageCanUpgrade(ns) > 45) {
                break;
            }
            await ns.sleep(minutes(1));
        }
        await ns.sleep(seconds(30));
    }
}

async function waitOrEarlyBreakWhen(ns: NS, ms: number, predicate: () => boolean) {
    let parts = ms / 1000;
    for (let i = 0; i < parts; i++) {
        if (predicate()) {
            break;
        }
        await ns.sleep(seconds(1));
        break;
    }
}

class ControllerManager {
    ns: NS;

    constructor(ns: NS) {
        this.ns = ns;
    }

    distributePoll() {
        let hackableServers = new ServerTraverser<Server>(this.ns, this.ns.scan, this.ns.getServer)
            .filter((s) => isHackable(s, this.ns.getHackingLevel()))
            .sort((a, b) => calculateProfitPerMs(this.ns, a) - calculateProfitPerMs(this.ns, b));

        let distributed = new ServerTraverser<Server>(this.ns, this.ns.scan, this.ns.getServer)
            .filter((s) => s.backdoorInstalled || s.purchasedByPlayer || s.hostname === 'home')
            .sort(ServerSort.byRam);

        for (let server of distributed) {
            if (hackableServers.length === 0) {
                this.ns.tprint('Ran out of hackable servers.');
                break;
            }
            this.ns.killall(server.hostname, true);
            let threads = maxPossibleThreads(this.ns, 'controller.js', server.hostname);
            if (threads === 0) {
                continue;
            }
            if (server.hostname === 'home') {
                // leave some margin on home to allow for ns.exec to run without issues.
                threads = Math.floor(threads * homeThreadMargin);
            }
            let serverToHack = hackableServers.pop();
            this.ns.tprint('Running controller on ' + server.hostname + " (hacking " + serverToHack.hostname + ")");
            this.ns.exec('controller.js', server.hostname, threads, serverToHack.hostname);
        }
        if (hackableServers.length > 0) {
            this.ns.tprint('Done distributing, servers still remaining: ' + hackableServers.map((s) => s.hostname).join(','));
        }
    }

    purchasePoll() {
        while (this.ns.purchaseServer('home', 2) !== '') { }
    }

    upgradePoll() {
        let servers = new ServerTraverser<Server>(this.ns, this.ns.scan, this.ns.getServer)
            .filter((s) => s.purchasedByPlayer)
            .sort(ServerSort.byRam);

        while (true) {
            let anyUpgraded = false;
            for (let server of servers) {
                if (server.hostname === 'home') {
                    continue;
                }

                if (this.ns.upgradePurchasedServer(server.hostname, server.maxRam * 2)) {
                    anyUpgraded = true;
                    server.maxRam = server.maxRam * 2;
                    this.ns.tprint('Upgraded ' + server.hostname + ' (' + server.maxRam + ' -> ' + server.maxRam * 2 + ')');
                }
            }
            if (anyUpgraded) {
                return;
            }
        }
    }

    poll() {
        this.purchasePoll();
        this.upgradePoll();
        this.distributePoll();
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

function percentageCanUpgrade(ns: NS): number {
    let servers = new ServerTraverser<Server>(ns, ns.scan, ns.getServer).traverse((s) => s.purchasedByPlayer);

    if (servers.length === 0) {
        return 0;
    }
    let upgradableServers = servers.filter((s) => canAfford(ns, ns.getPurchasedServerCost(s.maxRam * 2)));
    let pct = (upgradableServers.length / servers.length) * 100;
    return pct;
}

async function runAndWaitFor(ns: NS, scriptName: string) {
    let pid = ns.exec(scriptName, ns.getHostname());
    if (pid === 0) {
        // pid === 0 most likely means there's not enough threads available on the home server, so lower the home thread margin slightly to correct this automatically.
        homeThreadMargin -= 0.01;
    }
    await waitForScriptToFinish(ns, pid);
}

async function waitForScriptToFinish(ns: NS, pid: number) {
    if (pid === 0) {
        return;
    }
    while (ns.isRunning(pid)) {
        await ns.sleep(seconds(5));
    }
}

class ServerSort {
    static byRam(a: Server, b: Server) {
        // lowest to highest?
        return a.maxRam - b.maxRam;
    }

    static reverse(callable: (a: Server, b: Server) => number): (a: Server, b: Server) => number {
        return (a,b) => callable(b,a);
    }
}

function canAfford(ns: NS, price: number) {
    return price < ns.getServerMoneyAvailable('home');
}