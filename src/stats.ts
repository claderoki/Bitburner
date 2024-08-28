import type {NS, Server} from '../index';
import { ServerTraverser, isCrackable, isHackable } from './helper';

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


function numberWithCommas(x: number) {
    var parts = x.toString().split(".");
    parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,".");
    return parts.join(".");
}

export async function main(ns: NS) {
    let statusToSearch = ns.args.length > 0 ? ns.args[0] : null;
    let traverser = new ServerTraverser<Server>(ns, ns.scan, ns.getServer);
    let all = traverser.traverse(() => true);
    let infos = [];

    for (let server of all) {
        let info: ServerInfo = {
            server: server.hostname,
            path: traverser.paths[server.hostname],
            maxMoney: numberWithCommas(server.moneyMax),
            profitPerMS: '',
            status: ''
        }
        if (isHackable(server, ns.getHackingLevel())) {
            info.status = 'hackable'
        } else if (isCrackable(ns, server, ns.getHackingLevel(), ns.fileExists)) {
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

    if (true) {
        let cmd = infos.map((i) => i.path.split('.').join('; connect ')).join('\n\n');
        cmd += '; backdoor';
        ns.tprint(cmd);
    } else {
        for (let info of infos) {
            ns.tprint(info);
        }
    }
}

interface ServerInfo {
    server: string,
    path: string,
    status: string,
    maxMoney: string,
    profitPerMS: string,
}
