// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SafeHold
 * @notice On-chain Pro subscriptions for SafeHold.
 *
 *         A user pays `price` to get `PERIOD` of Pro access. Paying again while
 *         still active extends from the existing expiry rather than from now, so
 *         nobody loses time by renewing early.
 *
 *         The frontend gates Pro features on `isPro(address)`. The backend
 *         watches `Subscribed` events to know who to send alerts to - there is
 *         no subscriber array here, because iterating one on-chain would run out
 *         of gas exactly when the product succeeds.
 */
contract SafeHold {
    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// @notice Deployer. `immutable` is baked into the bytecode, so it is
    ///         cheaper to read than a normal storage variable.
    address public immutable owner;

    /// @notice Cost of one subscription period, in wei.
    uint256 public price;

    /// @notice Length of one subscription period.
    uint64 public constant PERIOD = 30 days;

    /// @notice Unix timestamp each address is Pro until. Unset reads as 0,
    ///         which is in the past, so a stranger is simply not Pro.
    mapping(address => uint64) public proUntil;

    // ---------------------------------------------------------------------
    // Events - the backend's read layer
    // ---------------------------------------------------------------------

    event Subscribed(address indexed user, uint64 until, uint256 paid);
    event PriceChanged(uint256 oldPrice, uint256 newPrice);
    event Withdrawn(address indexed to, uint256 amount);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error NotOwner();
    error WrongPrice(uint256 sent, uint256 required);
    error NothingToWithdraw();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(uint256 _price) {
        owner = msg.sender;
        price = _price;
    }

    // ---------------------------------------------------------------------
    // Subscribing
    // ---------------------------------------------------------------------

    /// @notice Buy one period of Pro. Requires exactly `price` - an exact match
    ///         rather than a minimum, so an overpay reverts instead of silently
    ///         keeping the difference.
    function subscribe() external payable {
        if (msg.value != price) revert WrongPrice(msg.value, price);

        uint64 nowTs = _now();
        uint64 current = proUntil[msg.sender];
        uint64 base = current > nowTs ? current : nowTs;
        uint64 until = base + PERIOD;

        proUntil[msg.sender] = until;

        emit Subscribed(msg.sender, until, msg.value);
    }

    /// @notice What the frontend gates Pro features on.
    function isPro(address user) external view returns (bool) {
        return proUntil[user] > _now();
    }

    /// @notice Seconds of Pro left, or 0. Handy for rendering "expires in N days".
    function proSecondsLeft(address user) external view returns (uint64) {
        uint64 nowTs = _now();
        uint64 until = proUntil[user];
        if (until <= nowTs) return 0;
        return until - nowTs;
    }

    // ---------------------------------------------------------------------
    // Owner
    // ---------------------------------------------------------------------

    /// @notice Change the price without redeploying. Existing subscriptions are
    ///         untouched - they were already paid for.
    function setPrice(uint256 newPrice) external onlyOwner {
        emit PriceChanged(price, newPrice);
        price = newPrice;
    }

    /// @notice Sweep revenue to the owner.
    /// @dev The event is emitted before the external call so that a reentrant
    ///      caller cannot reorder logs. A revert below would undo the event too.
    function withdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        if (amount == 0) revert NothingToWithdraw();

        emit Withdrawn(owner, amount);

        // Always `.call` - `.transfer`/`.send` forward a fixed 2300 gas and
        // break with smart-contract wallets.
        (bool ok,) = payable(owner).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /// @notice Current contract balance, in wei.
    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    // ---------------------------------------------------------------------
    // Time
    // ---------------------------------------------------------------------

    /// @dev Single place where we read the clock, so the reasoning lives once.
    ///
    ///      Validators can nudge `block.timestamp` by a few seconds. Our unit is
    ///      30 days, so that cannot meaningfully move an expiry - there is no
    ///      incentive and no exploitable edge.
    ///
    ///      The uint64 cast cannot truncate until the year 2554.
    // forge-lint: disable-next-line(unsafe-typecast)
    function _now() private view returns (uint64) {
        return uint64(block.timestamp);
    }

    // NOTE: deliberately no `receive()`. A plain AVAX transfer reverts rather
    // than being accepted with no subscription granted - money arriving with no
    // record of what it bought is worse than a failed send.
}
