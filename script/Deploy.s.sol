// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SafeHold} from "../src/SafeHold.sol";

contract Deploy is Script {
    function run() external returns (SafeHold sh) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        uint256 price = 0.05 ether;

        vm.startBroadcast(pk);
        sh = new SafeHold(price);
        vm.stopBroadcast();

        console.log("SafeHold deployed to:", address(sh));
        console.log(
            "Snowtrace: https://testnet.snowtrace.io/address/%s",
            address(sh)
        );
    }
}
