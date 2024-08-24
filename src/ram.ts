import type {NS} from '../index';

export async function main(ns: NS) {
    let ramUsage = ns.ls(ns.getHostname(), '.js').map((f) => {
        return {ram: ns.getScriptRam(f), file: f};
    });
    for (let ramU of ramUsage) {
        ns.tprint(ramU.file + ': ' + ramU.ram + 'GB ram');
    }
}