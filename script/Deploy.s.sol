// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {TipJar} from "../src/TipJar.sol";

/**
 * Deploy with:
 *   forge script script/Deploy.s.sol --rpc-url fuji --broadcast
 *
 * A script is reproducible and can deploy several contracts + wire them
 * together in one transaction batch. Use `forge create` for a one-off,
 * this for anything real.
 */
contract Deploy is Script {
    function run() external returns (TipJar jar) {
        uint256 pk = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(pk);
        jar = new TipJar("Hackathon Jar");
        vm.stopBroadcast();

        console.log("TipJar deployed to:", address(jar));
        console.log("Snowtrace: https://testnet.snowtrace.io/address/%s", address(jar));
    }
}
