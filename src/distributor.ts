import type { NS, Server } from '../index';
import { ServerTraverser, hashCode } from './helper';

export async function main(ns: NS) {
    new ControllerDistributor(ns).distribute();
}

class ControllerDistributor {
    ns: NS;

    constructor(ns: NS) {
        this.ns = ns;
    }

    FILES_TO_INJECT = ["controller.js"];
    CONTROLLER_FILE = this.FILES_TO_INJECT[0];

    isEligbleForDistribution(server: Server, hash: string) {
        if (server.hostname === 'home') {
            return false;
        }
        if (!server.backdoorInstalled && !server.purchasedByPlayer) {
            return false;
        }
        let serverHash = this.getHash(server);
        if (serverHash === null) {
            this.ns.tprint(server.hostname + ' no controller yet, will distribute.');
            return true;
        } else if (serverHash !== hash) {
            this.ns.tprint(server.hostname + ' has an out of date controller, will update.');
            return true;
        }
        return false;
    }

    getHash(server: Server) {
        let hashFiles = this.ns.ls(server.hostname, '.hash.txt');
        if (hashFiles.length === 0) {
            return null;
        }
        let hashFile = hashFiles[0];
        return hashFile.substring(0, hashFile.length - '.hash.txt'.length);
    }

    distributeTo(server: Server, hash: string) {
        // never delete or mess with files on home.
        if (server.hostname === 'home') {
            return;
        }

        let serverHash = this.getHash(server);
        if (serverHash !== hash) {
            for (let file of this.FILES_TO_INJECT) {
                this.ns.rm(file, server.hostname);
            }
            this.ns.rm(serverHash + '.hash.txt', server.hostname);
            this.ns.scp(this.FILES_TO_INJECT, server.hostname, this.ns.getHostname());
            this.ns.write(hash + '.hash.txt');
            this.ns.scp(hash + '.hash.txt', server.hostname, this.ns.getHostname());
        }
    }

    distribute() {
        let currentHash = hashCode(this.FILES_TO_INJECT.map((f) => this.ns.read(f)).join(',')).toString();
        new ServerTraverser<Server>(this.ns, this.ns.scan, this.ns.getServer)
            .traverse((s) => this.isEligbleForDistribution(s, currentHash))
            .forEach((s) => this.distributeTo(s, currentHash))
            ;
    }
}