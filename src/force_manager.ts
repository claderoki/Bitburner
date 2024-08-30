import type { NS } from '../index';
import { MANAGER_FORCE_PORT } from './helper';

export async function main(ns: NS) {
    ns.writePort(MANAGER_FORCE_PORT, 'anything');
}