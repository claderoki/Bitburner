import type {NS, Server} from '../index';
import { ServerTraverser, isCrackable, isHackable } from './helper';


function numberWithCommas(x: number) {
    var parts = x.toString().split(".");
    parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,".");
    return parts.join(".");
}

export async function main(ns: NS) {
    let statusToSearch = ns.args.length > 0 ? ns.args[0] : null;

    let all = new ServerTraverser(ns).traverse(() => true);
    let infos = [];

    let level = ns.getHackingLevel();
    for (let server of all) {
        let info: ServerInfo = {
            server: server.hostname,
            maxMoney: numberWithCommas(server.moneyMax),
            profitPerMS: '',
            status: ''
        }
        if (isHackable(ns, server, level)) {
            info.status = 'hackable'
        } else if (isCrackable(ns, server, level)) {
            info.status = 'crackable';
        } else {
            continue;
        }
        if (statusToSearch !== null && info.status !== statusToSearch) {
            continue;
        }
        info.profitPerMS = numberWithCommas(calculateProfitPerMs(ns, server));

        infos.push(info);
    }

    for (let info of infos) {
        ns.tprint(info);
    }
}

/**
 * Calculates the profit per millisecond for hacking a server.
 * @param {NS} ns - The Netscript object.
 * @param {string} server - The server hostname.
 * @returns {number} - The estimated profit per millisecond.
 */
function calculateProfitPerMs(ns: NS, server: Server): number {
    if (server.moneyMax <= 0) return 0;

    // Define the fraction of money to hack per cycle
    const hackFraction = 0.1; // 10%

    // Calculate the number of hack threads needed to hack hackFraction of current money
    const hackThreads = Math.ceil(ns.hackAnalyzeThreads(server.hostname, hackFraction * server.moneyAvailable));

    if (hackThreads <= 0) return 0;

    // Actual fraction hacked by the calculated hack threads
    const hackedFraction = ns.hackAnalyze(server.hostname) * hackThreads;
    const hackedMoney = hackedFraction * server.moneyAvailable;

    // Calculate the growth multiplier needed to restore money to max after hacking
    const newMoney = server.moneyAvailable - hackedMoney;
    const growthMultiplier = server.moneyMax / newMoney;

    if (growthMultiplier < 1) {
        // If growth multiplier is less than 1, no need to grow
        return 0;
    }

    // Calculate cycle time (assuming operations are synchronized)
    const cycleTime = Math.max(ns.getHackTime(server.hostname), ns.getGrowTime(server.hostname), ns.getWeakenTime(server.hostname));

    // Calculate total profit from hacking
    const profit = hackedMoney;

    // Calculate profit per millisecond
    const profitPerMs = profit / cycleTime;

    return profitPerMs;
}
interface ServerInfo {
    server: string,
    status: string,
    maxMoney: string,
    profitPerMS: string,
}