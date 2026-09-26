// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Test, console} from "forge-std/Test.sol";
import {SafeHoldScore} from "../src/SafeHoldScore_1.sol";

contract ScoreProbe is Test {
    SafeHoldScore s;
    function setUp() public { s = new SafeHoldScore(address(this)); }

    function test_RealTokens() public view {
        console.log("AVAX   0.38% / 43d ->", s.computeScore(38, 43, 0, 0));
        console.log("HYPE   4.46% / 10d ->", s.computeScore(446, 10, 0, 0));
        console.log("KMNO   4.08% /  4d ->", s.computeScore(408, 4, 0, 0));
        console.log("CARDS  6.26% /  3d ->", s.computeScore(626, 3, 0, 0));
        console.log("GUN    7.76% /  4d ->", s.computeScore(776, 4, 0, 0));
        console.log("DBR   10.20% / 21d ->", s.computeScore(1020, 21, 0, 0));
        console.log("2Z    47.70% /  6d ->", s.computeScore(4770, 6, 0, 0));
        console.log("CONX 100.00% / 19d ->", s.computeScore(10000, 19, 0, 0));
    }
}
