import type { NS, Server } from '../index';
import { ArgumentParser, MANAGER_CONFIG_PORT, MANAGER_FORCE_PORT, PORT_EMPTY, ServerTraverser, isHackable } from './helper';

interface Config {
    homeThreadMargin: number,
    debug: boolean,
    forceBreak: boolean,
    haltSpending: boolean
}

function seconds(seconds: number): number {
    return seconds * 1000;
}

function minutes(minutes: number): number {
    return seconds(minutes * 60);
}

const parser = new ArgumentParser()
    .addBoolArgument('debug', false)
    .addBoolArgument('haltSpending', false);

function updateConfig(ns: NS, config: Config) {
    if (ns.readPort(MANAGER_FORCE_PORT) !== PORT_EMPTY) {
        config.forceBreak = true;
    }
    let data = ns.readPort(MANAGER_CONFIG_PORT);
    if (data !== PORT_EMPTY) {
        let parsed = JSON.parse(data.toString());
        ns.tprint(JSON.parse(parsed));
    }
}

export async function main(ns: NS) {
    let args = parser.parse(ns);
    if (args == null) return;

    let config: Config = {
        homeThreadMargin: 0.9,
        debug: args.debug === '1',
        forceBreak: false,
        haltSpending: args.haltSpending === '1'
    }

    while (true) {
        updateConfig(ns, config);
        await runAndWaitFor(ns, config, 'crack.js');
        let manager = new ControllerManager(ns, config);
        await manager.poll();

        for (let i = 0; i < 60; i++) {
            updateConfig(ns, config);
            if (config.forceBreak) {
                ns.tprint('force breaking...');
                config.forceBreak = false;
                break;
            }

            if (percentageCanUpgrade(ns) > 45) {
                break;
            }
            await ns.sleep(minutes(1));
        }

        await ns.sleep(seconds(30));
    }
}

class ControllerManager {
    ns: NS;
    config: Config;

    constructor(ns: NS, config: Config) {
        this.ns = ns;
        this.config = config;
    }

    resetControllersPoll() {
        let hackableServers = new ServerTraverser<Server>(this.ns, this.ns.scan, this.ns.getServer)
            .filter((s) => isHackable(s, this.ns.getHackingLevel()))
            .sort((a, b) => calculateProfitPerMs(this.ns, a) - calculateProfitPerMs(this.ns, b));

        let distributed = new ServerTraverser<Server>(this.ns, this.ns.scan, this.ns.getServer)
            .filter((s) => s.backdoorInstalled || s.purchasedByPlayer);
        distributed.push(this.ns.getServer('home'));
        distributed.sort(ServerSort.byHighestRam)

        for (let server of distributed) {
            if (hackableServers.length === 0) {
                this.ns.tprint('Ran out of hackable servers.');
                break;
            }
            this.ns.killall(server.hostname, true);
            let threads = maxPossibleThreads(this.ns, 'controller.js', server.hostname);
            if (threads === 0) {
                this.ns.tprint('Can\'t run on ' + server.hostname + ', 0 threads.');
                continue;
            }
            if (server.hostname === 'home') {
                // leave some margin on home to allow for ns.exec to run without issues.
                threads = Math.floor(threads * this.config.homeThreadMargin);
            }
            let serverToHack = hackableServers.pop();
            this.ns.tprint('Running controller on ' + server.hostname + " (hacking " + serverToHack.hostname + ")");
            this.ns.exec('controller.js', server.hostname, threads, serverToHack.hostname);
        }
        if (hackableServers.length > 0) {
            this.ns.tprint('Done executing, servers still remaining: ' + hackableServers.map((s) => s.hostname).join(','));
        }
    }

    purchasePoll() {
        // minimum of ram to buy should be the amount of ram that will result in a server that can actually run controller.js.
        let requiredRam = this.ns.getScriptRam('controller.js');
        let ramToPurchase = 2;
        while (requiredRam > ramToPurchase) {
            ramToPurchase *= 2;
        }

        while (this.ns.purchaseServer('home', ramToPurchase) !== '') { }
    }

    upgradePoll() {
        let servers = new ServerTraverser<Server>(this.ns, this.ns.scan, this.ns.getServer)
            .filter((s) => s.purchasedByPlayer)
            .sort(ServerSort.byLowestRam);

        for (let server of servers) {
            if (server.hostname === 'home') {
                continue;
            }

            if (this.ns.upgradePurchasedServer(server.hostname, server.maxRam * 2)) {
                server.maxRam = server.maxRam * 2;
                this.ns.tprint('Upgraded ' + server.hostname + ' (' + server.maxRam + ' -> ' + server.maxRam * 2 + ')');
            }
        }
    }

    async poll() {
        if (!this.config.haltSpending) {
            this.purchasePoll();
            this.upgradePoll();
        }
        await runAndWaitFor(this.ns, this.config, 'distributor.js');
        this.resetControllersPoll();
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

async function runAndWaitFor(ns: NS, config: Config, scriptName: string) {
    let pid = ns.exec(scriptName, ns.getHostname());
    if (pid === 0) {
        // pid === 0 most likely means there's not enough threads available on the home server, so lower the home thread margin slightly to correct this automatically.
        config.homeThreadMargin -= 0.01;
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
    static byLowestRam(a: Server, b: Server) {
        return a.maxRam - b.maxRam;
    }
    static byHighestRam(a: Server, b: Server) {
        return b.maxRam - a.maxRam;
    }

    static reverse(callable: (a: Server, b: Server) => number): (a: Server, b: Server) => number {
        return (a,b) => callable(b,a);
    }
}

function canAfford(ns: NS, price: number) {
    return price < ns.getServerMoneyAvailable('home');
}