import type { NS } from '../index';
import { MANAGER_CONFIG_PORT } from './helper';

export async function main(ns: NS) {
    ns.writePort(MANAGER_CONFIG_PORT, JSON.stringify(ns.args));
}