// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TipJar
 * @notice A deliberately small contract that demonstrates every Solidity concept
 *         you actually need for a one-day hackathon: state, money, access
 *         control, events, and a mapping. Roughly 60 lines of real logic.
 *
 * MENTAL MODEL FOR A LARAVEL DEV
 * ------------------------------
 *  - This file is closer to a Model than a Controller. It owns its own storage.
 *  - `msg.sender` IS your auth system. There is no session, no middleware,
 *    no Auth::user(). It is the address that called this function, full stop.
 *  - Every state write costs the caller real gas. There is no free UPDATE.
 *    Store the minimum on-chain; keep everything else in your frontend/API.
 *  - `event` is your log AND your read layer. The frontend subscribes to these
 *    instead of polling - think broadcasting, not Eloquent queries.
 *  - There is no `SELECT * FROM tips`. You cannot iterate a mapping. If you
 *    need a list, you either emit events and read them off-chain, or you keep
 *    an explicit array - and an unbounded array WILL run out of gas on stage.
 */
contract TipJar {
    // ---------------------------------------------------------------------
    // Storage. Each of these is a paid disk write when changed.
    // ---------------------------------------------------------------------

    /// @notice The deployer. `immutable` is cheaper than a normal variable
    ///         because it is baked into the bytecode at deploy time.
    address public immutable owner;

    /// @notice Free-text label so the same contract can be reused for demos.
    string public name;

    /// @notice Running total ever received, in wei (1 AVAX = 1e18 wei).
    uint256 public totalTips;

    /// @notice How much each address has tipped. A mapping is a hash lookup:
    ///         O(1) read, but NOT iterable. Unset keys return 0, never null.
    mapping(address => uint256) public tipsBy;

    // ---------------------------------------------------------------------
    // Events. Indexed params are filterable by the frontend (max 3).
    // ---------------------------------------------------------------------

    event Tipped(address indexed from, uint256 amount, string message);
    event Withdrawn(address indexed to, uint256 amount);

    // ---------------------------------------------------------------------
    // Errors. Custom errors are far cheaper than require("long string").
    // ---------------------------------------------------------------------

    error NotOwner();
    error NothingSent();
    error NothingToWithdraw();
    error TransferFailed();

    // ---------------------------------------------------------------------
    // Modifier - the closest thing Solidity has to middleware.
    // ---------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _; // the function body gets spliced in here
    }

    /// @notice Runs exactly once, at deploy. Constructor args are passed on
    ///         the command line (see script/Deploy.s.sol).
    constructor(string memory _name) {
        owner = msg.sender;
        name = _name;
    }

    /// @notice `payable` is what allows a function to receive AVAX.
    ///         Without it, sending value to this function reverts.
    function tip(string calldata message) external payable {
        if (msg.value == 0) revert NothingSent();

        // `+=` on a mapping value is a storage write - this is the expensive line.
        tipsBy[msg.sender] += msg.value;
        totalTips += msg.value;

        emit Tipped(msg.sender, msg.value, message);
    }

    /// @notice Sweep the balance to the owner.
    /// @dev Checks-Effects-Interactions: validate, update state, THEN send.
    ///      Sending last is what stops a reentrancy attack.
    function withdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        if (amount == 0) revert NothingToWithdraw();

        // Always use .call for transfers. .transfer() and .send() forward a
        // fixed 2300 gas and break with smart-contract wallets.
        (bool ok, ) = payable(owner).call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(owner, amount);
    }

    /// @notice `view` costs nothing to call - it never touches storage.
    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Catches plain AVAX transfers with no calldata, so the contract
    ///         doesn't silently reject someone hitting "send" in their wallet.
    receive() external payable {
        tipsBy[msg.sender] += msg.value;
        totalTips += msg.value;
        emit Tipped(msg.sender, msg.value, "");
    }
}
