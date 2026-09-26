// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {SafeHold} from "../src/SafeHold.sol";

contract SafeHoldTest is Test {
    SafeHold sh;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint256 constant PRICE = 0.05 ether;

    function setUp() public {
        sh = new SafeHold(PRICE);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    // ---- deploy ----------------------------------------------------------

    function test_DeploySetsOwnerAndPrice() public view {
        assertEq(sh.owner(), address(this));
        assertEq(sh.price(), PRICE);
        assertEq(sh.PERIOD(), 30 days);
    }

    function test_StrangerIsNotPro() public view {
        assertFalse(sh.isPro(alice));
        assertEq(sh.proUntil(alice), 0);
        assertEq(sh.proSecondsLeft(alice), 0);
    }

    // ---- subscribing -----------------------------------------------------

    function test_SubscribeGrantsOnePeriod() public {
        vm.prank(alice);
        sh.subscribe{value: PRICE}();

        assertTrue(sh.isPro(alice));
        assertEq(sh.proUntil(alice), uint64(block.timestamp) + 30 days);
        assertEq(sh.balance(), PRICE);
    }

    function test_SubscribeEmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit SafeHold.Subscribed(alice, uint64(block.timestamp) + 30 days, PRICE);

        vm.prank(alice);
        sh.subscribe{value: PRICE}();
    }

    function test_RevertWhen_Underpaying() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SafeHold.WrongPrice.selector, PRICE - 1, PRICE));
        sh.subscribe{value: PRICE - 1}();
    }

    function test_RevertWhen_Overpaying() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SafeHold.WrongPrice.selector, PRICE + 1, PRICE));
        sh.subscribe{value: PRICE + 1}();
    }

    function test_RevertWhen_PayingNothing() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SafeHold.WrongPrice.selector, 0, PRICE));
        sh.subscribe{value: 0}();
    }

    /// Renewing early must extend from the existing expiry, not from now -
    /// otherwise an early renewal silently burns the remaining days.
    function test_RenewingEarlyExtendsFromExpiry() public {
        vm.prank(alice);
        sh.subscribe{value: PRICE}();
        uint64 first = sh.proUntil(alice);

        vm.warp(block.timestamp + 10 days); // 20 days still left

        vm.prank(alice);
        sh.subscribe{value: PRICE}();

        assertEq(sh.proUntil(alice), first + 30 days);
    }

    /// After lapsing, a new subscription starts from now - the user does not
    /// get credited for the gap.
    function test_ResubscribingAfterLapseStartsFromNow() public {
        vm.prank(alice);
        sh.subscribe{value: PRICE}();

        uint256 subscribedAt = block.timestamp;
        vm.warp(subscribedAt + 100 days); // long expired
        assertFalse(sh.isPro(alice));

        vm.prank(alice);
        sh.subscribe{value: PRICE}();

        assertEq(sh.proUntil(alice), uint64(block.timestamp) + 30 days);
    }

    function test_ProExpiresExactlyAtBoundary() public {
        vm.prank(alice);
        sh.subscribe{value: PRICE}();
        uint64 until = sh.proUntil(alice);

        vm.warp(until - 1);
        assertTrue(sh.isPro(alice), "still Pro one second before expiry");

        vm.warp(until);
        assertFalse(sh.isPro(alice), "not Pro at the expiry second itself");
    }

    function test_SubscriptionsAreIndependent() public {
        vm.prank(alice);
        sh.subscribe{value: PRICE}();

        assertTrue(sh.isPro(alice));
        assertFalse(sh.isPro(bob));
    }

    function test_ProSecondsLeftCountsDown() public {
        vm.prank(alice);
        sh.subscribe{value: PRICE}();

        assertEq(sh.proSecondsLeft(alice), 30 days);

        vm.warp(block.timestamp + 1 days);
        assertEq(sh.proSecondsLeft(alice), 29 days);
    }

    // ---- price -----------------------------------------------------------

    function test_OwnerCanChangePrice() public {
        sh.setPrice(0.1 ether);
        assertEq(sh.price(), 0.1 ether);

        vm.prank(alice);
        sh.subscribe{value: 0.1 ether}();
        assertTrue(sh.isPro(alice));
    }

    function test_RevertWhen_NonOwnerChangesPrice() public {
        vm.prank(alice);
        vm.expectRevert(SafeHold.NotOwner.selector);
        sh.setPrice(0);
    }

    /// A price change must not revoke access somebody already paid for.
    function test_PriceChangeDoesNotAffectExistingSubscribers() public {
        vm.prank(alice);
        sh.subscribe{value: PRICE}();
        uint64 until = sh.proUntil(alice);

        sh.setPrice(5 ether);

        assertTrue(sh.isPro(alice));
        assertEq(sh.proUntil(alice), until);
    }

    // ---- withdraw --------------------------------------------------------

    function test_OwnerCanWithdraw() public {
        vm.prank(alice);
        sh.subscribe{value: PRICE}();
        vm.prank(bob);
        sh.subscribe{value: PRICE}();

        uint256 before = address(this).balance;
        sh.withdraw();

        assertEq(address(this).balance - before, PRICE * 2);
        assertEq(sh.balance(), 0);
    }

    function test_RevertWhen_NonOwnerWithdraws() public {
        vm.prank(alice);
        sh.subscribe{value: PRICE}();

        vm.prank(bob);
        vm.expectRevert(SafeHold.NotOwner.selector);
        sh.withdraw();
    }

    function test_RevertWhen_WithdrawingEmpty() public {
        vm.expectRevert(SafeHold.NothingToWithdraw.selector);
        sh.withdraw();
    }

    /// Withdrawing must not wipe anyone's subscription.
    function test_WithdrawKeepsSubscriptionsIntact() public {
        vm.prank(alice);
        sh.subscribe{value: PRICE}();

        sh.withdraw();

        assertTrue(sh.isPro(alice));
    }

    // ---- plain transfers -------------------------------------------------

    /// There is no receive(), so a bare send reverts rather than vanishing.
    function test_RevertWhen_PlainTransferSent() public {
        vm.prank(alice);
        (bool ok,) = address(sh).call{value: 1 ether}("");
        assertFalse(ok, "bare AVAX transfer should revert");
        assertEq(sh.balance(), 0);
    }

    // ---- fuzz ------------------------------------------------------------

    /// Whatever the owner sets the price to, paying exactly that grants a period.
    function testFuzz_AnyPriceWorksWhenPaidExactly(uint96 newPrice) public {
        sh.setPrice(newPrice);
        vm.deal(alice, newPrice);

        vm.prank(alice);
        sh.subscribe{value: newPrice}();

        assertTrue(sh.isPro(alice));
        assertEq(sh.proUntil(alice), uint64(block.timestamp) + 30 days);
    }

    /// Subscribing repeatedly adds exactly one period each time.
    function testFuzz_RepeatedRenewalsAccumulate(uint8 times) public {
        vm.assume(times > 0 && times <= 20);
        vm.deal(alice, PRICE * uint256(times));

        uint64 start = uint64(block.timestamp);
        for (uint256 i = 0; i < times; i++) {
            vm.prank(alice);
            sh.subscribe{value: PRICE}();
        }

        assertEq(sh.proUntil(alice), start + (uint64(times) * 30 days));
    }

    // Needed so this test contract can receive AVAX in the withdraw tests.
    receive() external payable {}
}
