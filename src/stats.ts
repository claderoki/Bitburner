import type {NS, Server} from '../index';
import { ServerTraverser, calculateProfitPerMs, isCrackable, isHackable } from './helper';


function numberWithCommas(x: number) {
    var parts = x.toString().split(".");
    parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,".");
    return parts.join(".");
}

export async function main(ns: NS) {
    let statusToSearch = ns.args.length > 0 ? ns.args[0] : null;
    let traverser = new ServerTraverser(ns);
    let all = traverser.traverse(() => true);
    let infos = [];

    let level = ns.getHackingLevel();
    for (let server of all) {
        let info: ServerInfo = {
            server: server.hostname,
            path: traverser.paths[server.hostname],
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

interface ServerInfo {
    server: string,
    path: string,
    status: string,
    maxMoney: string,
    profitPerMS: string,
}
