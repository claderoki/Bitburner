import type { NS } from '../index';
import { numberWithCommas } from './helper';

export async function main(ns: NS) {
    let target = 'foodnstuff';
    let stockSymbol = 'FNS';
    let host = ns.getHostname();

    let securityThresh = ns.getServerMinSecurityLevel(target) + 5;
    let maxMoney = ns.getServerMaxMoney(target);

    let profitMade = 0;
    while (true) {
        while (ns.getServerSecurityLevel(target) > securityThresh) {
            await ns.weaken(target, {stock: true});
        }
        while (ns.getServerMoneyAvailable(target) !== 0) {
            await ns.hack(target, {stock: true});
        }
        let askPrice = ns.stock.getAskPrice(stockSymbol);
        let maxPurchasable = Math.min(Math.floor(ns.getServerMoneyAvailable(host) / askPrice), ns.stock.getMaxShares(stockSymbol)) / 2;
        if (ns.stock.buyStock(stockSymbol, maxPurchasable) === 0) {
            ns.tprint('Didnt buy anything, tried to buy ' +  maxPurchasable);
            return;
        }
        let cost = Math.floor(askPrice * maxPurchasable);
        ns.tprint('Bought ' + maxPurchasable + ' for ' + numberWithCommas(Math.floor(cost)));
        profitMade -= cost;

        while (ns.getServerMoneyAvailable(target) !== maxMoney) {
            await ns.grow(target, {stock: true});
        }
        let sellPrice = ns.stock.sellStock(stockSymbol, maxPurchasable);
        if (sellPrice === 0) {
            ns.tprint('uh oh');
            return;
        }
        let totalMoneyMade = Math.floor(maxPurchasable * sellPrice);
        ns.tprint('Sold ' + maxPurchasable + ' for ' + numberWithCommas(totalMoneyMade));

        profitMade += totalMoneyMade;
        if (profitMade < 0) {
            ns.tprint('You lost money.');
            return;
        }
    }
}