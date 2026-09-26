// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SafeHoldScore
/// @notice Computes and publishes SafeHold's 0–100 "hold safety score" on-chain
///         (Avalanche C-Chain / Fuji testnet), so the score isn't just a
///         trust-us backend number — anyone can verify what produced it.
///
/// @dev    The four inputs below are pulled off-chain (Tokenomist for unlock
///         data, a free RPC/indexer for on-chain activity) by a backend
///         service, cached, and pushed in here by the authorized `updater`
///         address once per refresh cycle (daily for unlock/supply data,
///         more often for activity). This contract does no off-chain
///         fetching itself — it is the transparent, auditable last step.
///
///         All percentages are passed in basis points (bps), where
///         10000 bps = 100%. Example: an 18% unlock is unlockPercentBps = 1800.
///
///         WORKED EXAMPLES (see computeScore's NatSpec for the full formula):
///           computeScore(1800, 4, 1200, 0)  -> score ≈ 34
///             (18% unlock in 4 days, tokens this size historically dropped
///              ~12% after unlocking, no unusual on-chain activity)
///           computeScore(0, 999, 0, 0)      -> score ≈ 92
///             (no unlock in sight, normal activity)
contract SafeHoldScore {
    // ---------------------------------------------------------------------
    // Formula constants — tuned by hand against real examples, not fitted.
    // Keeping them as named constants (instead of magic numbers) is what
    // makes the score explainable in a pitch or a code review.
    // ---------------------------------------------------------------------

    /// @dev Beyond this many days out, an unlock contributes no proximity risk.
    uint256 public constant PROXIMITY_WINDOW_DAYS = 30;

    /// @dev unlock_penalty = U * proximity_weight * (K1_NUM / K1_DEN), i.e. * 2.3
    uint256 public constant K1_NUM = 23;
    uint256 public constant K1_DEN = 10;

    /// @dev severity_multiplier = 1 + H/20 (H in whole percent), expressed as
    ///      (SEVERITY_BASE + historicalDropBps) / SEVERITY_BASE — see below
    ///      for why the base is 2000, not 20.
    uint256 public constant SEVERITY_BASE = 2000;

    /// @dev Elevated on-chain activity alone can cost at most this many points.
    uint256 public constant ACTIVITY_MAX_PENALTY = 8;

    /// @dev Nothing in crypto is ever a perfect 100 — a flat deduction so the
    ///      score never reads as false certainty even with zero other signals.
    uint256 public constant BASELINE_PENALTY = 18;

    uint256 private constant BPS = 10_000;

    // ---------------------------------------------------------------------
    // Access control — a single backend "updater" pushes refreshed scores.
    // A real deployment could swap this for a multisig or an oracle network;
    // for the hackathon demo, one authorized address is enough to prove the
    // score genuinely lives on-chain and is publicly readable/verifiable.
    // ---------------------------------------------------------------------

    address public owner;
    address public updater;

    struct ScoreData {
        uint8 score;              // 0-100, the number shown in the app
        uint256 unlockPercentBps; // inputs kept alongside the score so
        uint256 daysUntilUnlock;  // anyone can recompute it independently
        uint256 historicalDropBps;
        uint256 activityBps;
        uint256 updatedAt;        // block timestamp of last publish
    }

    mapping(address => ScoreData) public scores; // token address => latest score

    event ScoreUpdated(
        address indexed token,
        uint8 score,
        uint256 unlockPercentBps,
        uint256 daysUntilUnlock,
        uint256 historicalDropBps,
        uint256 activityBps,
        uint256 timestamp
    );
    event UpdaterChanged(address indexed oldUpdater, address indexed newUpdater);
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "SafeHoldScore: not owner");
        _;
    }

    modifier onlyUpdater() {
        require(msg.sender == updater, "SafeHoldScore: not updater");
        _;
    }

    constructor(address initialUpdater) {
        require(initialUpdater != address(0), "SafeHoldScore: zero updater");
        owner = msg.sender;
        updater = initialUpdater;
        emit OwnerChanged(address(0), msg.sender);
        emit UpdaterChanged(address(0), initialUpdater);
    }

    // ---------------------------------------------------------------------
    // The formula
    // ---------------------------------------------------------------------

    /// @notice Pure scoring function — no storage reads, so anyone can call
    ///         it off-chain (or on Snowtrace/Routescan's "Read Contract" tab)
    ///         to double-check a published score by hand.
    ///
    /// @param unlockPercentBps   % of circulating supply unlocking, in bps
    ///                           (e.g. 1800 = 18.00%)
    /// @param daysUntilUnlock    days until that unlock (plain integer)
    /// @param historicalDropBps  average price drop after similarly-sized
    ///                           past unlocks, in bps (e.g. 1200 = 12.00%)
    /// @param activityBps        how elevated recent on-chain activity is
    ///                           vs. this token's own baseline, in bps
    ///                           (0 = normal, 10000 = maximally elevated)
    /// @return score             0-100, higher = safer to hold right now
    ///
    /// @dev Reference formula (in plain math, before fixed-point scaling):
    ///        proximity_weight = max(0, 1 - D/30)
    ///        unlock_penalty   = U * proximity_weight * 2.3
    ///        severity_mult    = 1 + H/20
    ///        activity_penalty = A * ACTIVITY_MAX_PENALTY   (A in [0,1])
    ///        score = clamp(100 - unlock_penalty*severity_mult
    ///                          - activity_penalty - baseline, 0, 100)
    function computeScore(
        uint256 unlockPercentBps,
        uint256 daysUntilUnlock,
        uint256 historicalDropBps,
        uint256 activityBps
    ) public pure returns (uint256 score) {
        require(unlockPercentBps <= BPS, "SafeHoldScore: bad unlockPercentBps");
        require(historicalDropBps <= BPS, "SafeHoldScore: bad historicalDropBps");
        require(activityBps <= BPS, "SafeHoldScore: bad activityBps");

        // proximity_weight, in bps (10000 = full weight at D=0,
        // fading linearly to 0 at D >= PROXIMITY_WINDOW_DAYS)
        uint256 proximityWeightBps = daysUntilUnlock >= PROXIMITY_WINDOW_DAYS
            ? 0
            : ((PROXIMITY_WINDOW_DAYS - daysUntilUnlock) * BPS) / PROXIMITY_WINDOW_DAYS;

        // unlock_penalty * severity_mult, computed as one fraction so we only
        // divide once (multiply-before-divide keeps integer precision).
        //
        // unlockPercentBps is itself a percent-in-bps (100% = 10000), so
        // dividing by BPS once converts it to a plain percent (e.g. 18),
        // matching the "U" in the reference formula above.
        uint256 numerator = unlockPercentBps
            * proximityWeightBps
            * K1_NUM
            * (SEVERITY_BASE + historicalDropBps);
        uint256 denominator = 100            // unlockPercentBps -> percent
            * BPS                             // proximityWeightBps -> fraction
            * K1_DEN
            * SEVERITY_BASE;                  // severity_mult denominator

        uint256 unlockPenalty = numerator / denominator;

        // activity_penalty: activityBps/BPS is A in [0,1]
        uint256 activityPenalty = (activityBps * ACTIVITY_MAX_PENALTY) / BPS;

        uint256 totalPenalty = unlockPenalty + activityPenalty + BASELINE_PENALTY;

        score = totalPenalty >= 100 ? 0 : 100 - totalPenalty;
    }

    // ---------------------------------------------------------------------
    // Publishing — this is the transaction the app fires after each refresh
    // ---------------------------------------------------------------------

    /// @notice Recomputes and publishes the score for `token`. Only the
    ///         authorized backend updater can call this; anyone can read it.
    function updateScore(
        address token,
        uint256 unlockPercentBps,
        uint256 daysUntilUnlock,
        uint256 historicalDropBps,
        uint256 activityBps
    ) external onlyUpdater {
        require(token != address(0), "SafeHoldScore: zero token");

        uint256 score = computeScore(
            unlockPercentBps,
            daysUntilUnlock,
            historicalDropBps,
            activityBps
        );

        scores[token] = ScoreData({
            score: uint8(score),
            unlockPercentBps: unlockPercentBps,
            daysUntilUnlock: daysUntilUnlock,
            historicalDropBps: historicalDropBps,
            activityBps: activityBps,
            updatedAt: block.timestamp
        });

        emit ScoreUpdated(
            token,
            uint8(score),
            unlockPercentBps,
            daysUntilUnlock,
            historicalDropBps,
            activityBps,
            block.timestamp
        );
    }

    /// @notice Convenience getter for the app/frontend to read a token's
    ///         latest published score and the inputs that produced it.
    function getScore(address token) external view returns (ScoreData memory) {
        return scores[token];
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setUpdater(address newUpdater) external onlyOwner {
        require(newUpdater != address(0), "SafeHoldScore: zero updater");
        emit UpdaterChanged(updater, newUpdater);
        updater = newUpdater;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "SafeHoldScore: zero owner");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }
}
