// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {TipJar} from "../src/TipJar.sol";

/**
 * Foundry tests are written in Solidity, so you learn ONE language instead of
 * two. `forge test` runs in milliseconds - much faster than your PHPUnit loop.
 *
 * The cheatcodes you will actually use:
 *   vm.prank(addr)       - next call comes FROM addr  (your "acting as" helper)
 *   vm.deal(addr, 1 ether) - give addr a balance
 *   vm.expectRevert(...) - assert the next call fails
 *   vm.expectEmit(...)   - assert an event fired
 */
contract TipJarTest is Test {
    TipJar jar;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    // Runs before EVERY test function, like setUp() in PHPUnit.
    function setUp() public {
        jar = new TipJar("Demo Jar");
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function test_OwnerIsDeployer() public view {
        assertEq(jar.owner(), address(this));
        assertEq(jar.name(), "Demo Jar");
    }

    function test_TipRecordsSenderAndTotal() public {
        vm.prank(alice);
        jar.tip{value: 1 ether}("good luck");

        assertEq(jar.tipsBy(alice), 1 ether);
        assertEq(jar.totalTips(), 1 ether);
        assertEq(jar.balance(), 1 ether);
    }

    function test_TipAccumulatesAcrossSenders() public {
        vm.prank(alice);
        jar.tip{value: 1 ether}("one");

        vm.prank(bob);
        jar.tip{value: 2 ether}("two");

        vm.prank(alice);
        jar.tip{value: 0.5 ether}("three");

        assertEq(jar.tipsBy(alice), 1.5 ether);
        assertEq(jar.tipsBy(bob), 2 ether);
        assertEq(jar.totalTips(), 3.5 ether);
    }

    function test_RevertWhen_TipIsZero() public {
        vm.prank(alice);
        vm.expectRevert(TipJar.NothingSent.selector);
        jar.tip{value: 0}("cheapskate");
    }

    function test_EmitsTippedEvent() public {
        vm.expectEmit(true, false, false, true);
        emit TipJar.Tipped(alice, 1 ether, "hello");

        vm.prank(alice);
        jar.tip{value: 1 ether}("hello");
    }

    function test_RevertWhen_NonOwnerWithdraws() public {
        vm.prank(alice);
        jar.tip{value: 1 ether}("hi");

        vm.prank(bob); // bob is not the owner
        vm.expectRevert(TipJar.NotOwner.selector);
        jar.withdraw();
    }

    function test_OwnerCanWithdraw() public {
        vm.prank(alice);
        jar.tip{value: 3 ether}("hi");

        uint256 before = address(this).balance;
        jar.withdraw(); // this test contract IS the owner
        assertEq(address(this).balance - before, 3 ether);
        assertEq(jar.balance(), 0);
    }

    function test_RevertWhen_WithdrawingEmpty() public {
        vm.expectRevert(TipJar.NothingToWithdraw.selector);
        jar.withdraw();
    }

    function test_ReceiveHandlesPlainTransfer() public {
        vm.prank(alice);
        (bool ok, ) = address(jar).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(jar.tipsBy(alice), 1 ether);
    }

    /**
     * A fuzz test. Foundry runs this 256 times with random values - it finds
     * the edge cases you would not have thought to write by hand.
     */
    function testFuzz_TipAnyAmount(uint96 amount) public {
        vm.assume(amount > 0);
        vm.deal(alice, amount);

        vm.prank(alice);
        jar.tip{value: amount}("fuzz");

        assertEq(jar.tipsBy(alice), amount);
    }

    // Required so this test contract can receive AVAX in test_OwnerCanWithdraw.
    receive() external payable {}
}
